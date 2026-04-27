require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const axios = require('axios');
const admin = require('firebase-admin');
const cron = require('node-cron');

// ===== CACHE =====
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 });

// ===== FIREBASE ADMIN =====
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

// Armazena: token -> {fcmToken, lastCheck, lastNotas, lastAvaliacoes}
const subscriptions = new Map();

// ===== IMPORTS =====
const authRoutes = require('./src/routes/auth');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARES =====
app.use(cors({
    origin: [
        'http://localhost:5500',
        'https://if-hub-frontend.onrender.com',
        'https://simplifrn.vercel.app'
    ],
    credentials: true
}));

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'if-smart-secret-key',
    resave: false,
    saveUninitialized: false
}));

// ===== ROTAS BÁSICAS =====
app.get('/ping', (req, res) => {
    console.log("Pong! Eu estou acordado!");
    res.send("pong");
});

// ===== ROTAS DE NOTIFICAÇÃO =====

// Inscrever para notificações
app.post('/api/notifications/subscribe', async (req, res) => {
    try {
        const { fcmToken, token } = req.body;
        
        if (!fcmToken || !token) {
            return res.status(400).json({ erro: 'Dados incompletos' });
        }

        subscriptions.set(token, {
            fcmToken,
            lastCheck: new Date(),
            lastNotas: new Map(),
            lastAvaliacoes: new Set()
        });

        console.log(`✅ Inscrito: ${fcmToken.substring(0, 30)}...`);
        res.json({ success: true });

    } catch (err) {
        console.error('Erro subscribe:', err);
        res.status(500).json({ erro: 'Erro ao inscrever' });
    }
});

// Cancelar inscrição
app.post('/api/notifications/unsubscribe', (req, res) => {
    const { token } = req.body;
    subscriptions.delete(token);
    console.log(`❌ Removido: ${token?.substring(0, 20)}...`);
    res.json({ success: true });
});

// Verificar status
app.get('/api/notifications/status', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    res.json({ 
        subscribed: subscriptions.has(token),
        total: subscriptions.size
    });
});

// ===== ROTAS DE TESTE =====

// Testar notificação manual
app.get('/api/test/notificacao', async (req, res) => {
    if (subscriptions.size === 0) {
        return res.json({ erro: 'Nenhum usuário inscrito' });
    }

    let enviadas = 0;
    
    for (const [token, userData] of subscriptions) {
        const sucesso = await enviarFCM(userData.fcmToken, {
            title: '🧪 Teste SIMPLIF',
            body: 'Suas notificações estão funcionando! 🎉',
            url: '/dashboard.html'
        });
        if (sucesso) enviadas++;
    }
    
    res.json({ enviadas, total: subscriptions.size });
});

// Ver status das inscrições
app.get('/api/test/status', (req, res) => {
    const status = [];
    for (const [token, data] of subscriptions) {
        status.push({
            token: token.substring(0, 20) + '...',
            fcmToken: data.fcmToken.substring(0, 30) + '...',
            lastCheck: data.lastCheck
        });
    }
    res.json({ subscriptions: status, total: subscriptions.size });
});

// Simular avaliação nova
app.get('/api/test/simular-avaliacao', async (req, res) => {
    if (subscriptions.size === 0) {
        return res.json({ erro: 'Nenhum usuário inscrito' });
    }

    for (const [token, userData] of subscriptions) {
        await enviarFCM(userData.fcmToken, {
            title: '📝 Nova Avaliação Agendada!',
            body: 'Prova de Matemática em 7 dias (SIMULAÇÃO)',
            url: '/dashboard.html#avaliacoes'
        });
    }
    
    res.json({ simulado: true, para: subscriptions.size });
});

// ===== CRON JOB =====
cron.schedule('*/30 * * * *', async () => {
    console.log('🔍 Verificando novidades...', new Date().toISOString());
    
    if (subscriptions.size === 0) {
        console.log('Nenhum usuário inscrito');
        return;
    }

    for (const [token, userData] of subscriptions) {
        try {
            await verificarNovidades(token, userData);
        } catch (err) {
            console.error(`Erro ${token.substring(0, 20)}:`, err.message);
        }
    }
});

// Função que verifica novidades no SUAP
async function verificarNovidades(token, userData) {
    const { SUAP_BASE_URL } = process.env;
    
    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
    };

    const anoAtual = new Date().getFullYear();
    let notificacoes = 0;

    console.log(`\n🔍 [${new Date().toLocaleTimeString()}] Usuário: ${token.substring(0, 20)}...`);

    // ===== VERIFICAR NOTAS NOVAS =====
    try {
        const boletimRes = await axios.get(
            `${SUAP_BASE_URL}/api/ensino/meu-boletim/${anoAtual}/1/`,
            { headers, timeout: 10000 }
        );

        const disciplinas = boletimRes.data?.results || [];
        console.log(`  📊 ${disciplinas.length} disciplinas`);

        for (const disc of disciplinas) {
            for (let etapa = 1; etapa <= 4; etapa++) {
                const notaKey = `${disc.codigo_diario}_etapa${etapa}`;
                const notaAtual = disc[`nota_etapa_${etapa}`]?.nota;
                const notaAnterior = userData.lastNotas.get(notaKey);

                if (notaAtual !== null && notaAtual !== undefined && notaAnterior === undefined) {
                    console.log(`    🔔 NOTA NOVA: ${disc.disciplina} - ${etapa}ª: ${notaAtual}`);
                    
                    userData.lastNotas.set(notaKey, notaAtual);
                    
                    await enviarFCM(userData.fcmToken, {
                        title: '📊 Nota Publicada!',
                        body: `${disc.disciplina.split(' - ')[1] || disc.disciplina}: ${notaAtual} (${etapa}ª etapa)`,
                        url: '/dashboard.html#boletim'
                    });
                    
                    notificacoes++;
                }
            }
        }
    } catch (err) {
        if (err.response?.status === 401) {
            console.log(`  ⚠️ Token expirado`);
        } else {
            console.error('  ❌ Erro boletim:', err.message);
        }
    }

    // ===== VERIFICAR AVALIAÇÕES NOVAS =====
    try {
        const avalRes = await axios.get(
            `${SUAP_BASE_URL}/api/ensino/minhas-proximas-avaliacoes/`,
            { headers, timeout: 10000 }
        );

        const avaliacoes = avalRes.data?.results || [];
        console.log(`  📝 ${avaliacoes.length} avaliações`);

        for (const av of avaliacoes) {
            const avId = av.id.toString();
            
            if (!userData.lastAvaliacoes.has(avId)) {
                console.log(`    🔔 AVALIAÇÃO NOVA: ${av.descricao || 'Prova'}`);
                
                userData.lastAvaliacoes.add(avId);
                
                const dias = Math.ceil((new Date(av.data) - new Date()) / (1000 * 60 * 60 * 24));
                
                await enviarFCM(userData.fcmToken, {
                    title: '📝 Nova Avaliação Agendada!',
                    body: `${av.descricao || 'Prova'} em ${dias} dias`,
                    url: '/dashboard.html#avaliacoes'
                });
                
                notificacoes++;
            }
        }
    } catch (err) {
        console.error('  ❌ Erro avaliações:', err.message);
    }

    userData.lastCheck = new Date();
    console.log(`  ✅ ${notificacoes} notificação(ões)\n`);
}

// Helper: enviar notificação via FCM
async function enviarFCM(fcmToken, data) {
    try {
        await admin.messaging().send({
            token: fcmToken,
            notification: {
                title: data.title,
                body: data.body
            },
            webpush: {
                fcmOptions: {
                    link: 'https://simplifrn.vercel.app' + data.url
                },
                notification: {
                    icon: 'https://if-hub.netlify.app/assets/icons/IF HUB - SEM FUNDO - 192x192.png',
                    badge: 'https://if-hub.netlify.app/assets/icons/badge-72x72.png'
                }
            }
        });
        console.log('✅ FCM enviado');
        return true;
        
    } catch (err) {
        console.error('❌ Erro FCM:', err.code, err.message);
        if (err.code === 'messaging/registration-token-not-registered') {
            // Token inválido
            return false;
        }
        return false;
    }
}

// ===== ROTAS PRINCIPAIS =====
app.use('/auth', authRoutes);

app.use('/api', (req, res, next) => {
    req.cache = cache;
    next();
}, apiRoutes);

app.listen(PORT, () => {
    console.log(`✅ Backend rodando em http://localhost:${PORT}`);
    console.log(`📡 Frontend: http://localhost:5500`);
    console.log(`🔔 Notificações: ${subscriptions.size} inscritos`);
    console.log(`⏰ Verificação: a cada 30 minutos`);
    console.log(`🧪 Teste: /api/test/notificacao`);
});