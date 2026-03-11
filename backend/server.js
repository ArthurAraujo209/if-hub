require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const axios = require('axios');

// ===== CACHE =====
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 });

// ===== NOTIFICAÇÕES PUSH =====
const webpush = require('web-push');
const cron = require('node-cron');

// Configurar VAPID (coloque suas chaves no .env!)
webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:contato@ifhub.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// Armazena subscriptions: userId -> {subscription, lastNotas, lastAvaliacoes}
const subscriptions = new Map();
// ==============================

const authRoutes = require('./src/routes/auth');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
app.use(cors({
    origin: [
        'http://localhost:5500',
        'https://if-hub-frontend.onrender.com',
        'https://if-hub.netlify.app'
    ],
    credentials: true
}));

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'if-smart-secret-key',
    resave: false,
    saveUninitialized: false
}));

// ===== ROTA PING =====
app.get('/ping', (req, res) => {
    console.log("Pong! Eu estou acordado!");
    res.send("pong");
});

// ===== ROTAS DE NOTIFICAÇÃO =====

// 1. Inscrever para notificações
app.post('/api/notifications/subscribe', async (req, res) => {
    try {
        const { subscription, token } = req.body;
        
        if (!subscription || !token) {
            return res.status(400).json({ erro: 'Dados incompletos' });
        }

        const userId = token;
        
        subscriptions.set(userId, {
            subscription,
            lastCheck: new Date(),
            lastNotas: new Map(),
            lastAvaliacoes: new Set()
        });

        console.log(`✅ Usuário inscrito: ${userId.substring(0, 20)}...`);
        res.json({ success: true, message: 'Inscrito com sucesso!' });

    } catch (err) {
        console.error('Erro subscribe:', err);
        res.status(500).json({ erro: 'Erro ao inscrever' });
    }
});

// 2. Cancelar inscrição
app.post('/api/notifications/unsubscribe', (req, res) => {
    const { token } = req.body;
    const userId = token;
    
    subscriptions.delete(userId);
    console.log(`❌ Usuário removido: ${userId.substring(0, 20)}...`);
    
    res.json({ success: true });
});

// 3. Verificar status da inscrição
app.get('/api/notifications/status', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const userId = token;
    
    res.json({ 
        subscribed: subscriptions.has(userId),
        totalInscritos: subscriptions.size
    });
});

// ===== ROTAS DE TESTE (REMOVER DEPOIS) =====

// Testar notificação manual
app.get('/api/test/notificacao', async (req, res) => {
    console.log('🧪 TESTE: Enviando notificação manual...');
    
    if (subscriptions.size === 0) {
        return res.json({ erro: 'Nenhum usuário inscrito' });
    }

    let enviadas = 0;
    
    for (const [userId, userData] of subscriptions) {
        try {
            await webpush.sendNotification(userData.subscription, JSON.stringify({
                title: '🧪 Teste IF HUB',
                body: 'Suas notificações estão funcionando! 🎉',
                tag: 'teste-' + Date.now(),
                url: '/dashboard.html',
                actions: [{ action: 'ver', title: 'Abrir App' }]
            }));
            enviadas++;
        } catch (err) {
            console.error('Erro:', err.message);
        }
    }
    
    res.json({ enviadas, total: subscriptions.size });
});

// Ver status das inscrições
app.get('/api/test/status', (req, res) => {
    const status = [];
    for (const [userId, data] of subscriptions) {
        status.push({
            userId: userId.substring(0, 20) + '...',
            lastCheck: data.lastCheck,
            totalNotas: data.lastNotas.size,
            totalAvaliacoes: data.lastAvaliacoes.size
        });
    }
    res.json({ subscriptions: status, total: subscriptions.size });
});

// Simular avaliação nova
app.get('/api/test/simular-avaliacao', async (req, res) => {
    console.log('🎭 SIMULANDO avaliação nova...');
    
    if (subscriptions.size === 0) {
        return res.json({ erro: 'Nenhum usuário inscrito' });
    }

    for (const [userId, userData] of subscriptions) {
        await webpush.sendNotification(userData.subscription, JSON.stringify({
            title: '📝 Nova Avaliação Agendada!',
            body: 'Prova de Matemática em 7 dias (SIMULAÇÃO)',
            tag: 'simulada-' + Date.now(),
            url: '/dashboard.html#avaliacoes',
            actions: [{ action: 'ver', title: 'Ver Avaliações' }]
        }));
    }
    
    res.json({ simulado: true, para: subscriptions.size });
});

// ===== CRON JOB - VERIFICAÇÃO PERIÓDICA =====
cron.schedule('*/30 * * * *', async () => {
    console.log('🔍 Verificando novidades...', new Date().toISOString());
    
    if (subscriptions.size === 0) {
        console.log('Nenhum usuário inscrito');
        return;
    }

    for (const [userId, userData] of subscriptions) {
        try {
            await verificarNovidades(userId, userData);
        } catch (err) {
            console.error(`Erro ${userId.substring(0, 20)}:`, err.message);
        }
    }
});

// Função que verifica novidades no SUAP
async function verificarNovidades(userId, userData) {
    const { SUAP_BASE_URL } = process.env;
    const token = userId;
    
    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
    };

    const anoAtual = new Date().getFullYear();
    let notificacoes = 0;

    console.log(`\n🔍 [${new Date().toLocaleTimeString()}] Usuário: ${userId.substring(0, 20)}...`);

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

                // Nota nova detectada
                if (notaAtual !== null && notaAtual !== undefined && notaAnterior === undefined) {
                    console.log(`    🔔 NOTA NOVA: ${disc.disciplina} - ${etapa}ª: ${notaAtual}`);
                    
                    userData.lastNotas.set(notaKey, notaAtual);
                    
                    await webpush.sendNotification(userData.subscription, JSON.stringify({
                        title: '📊 Nota Publicada!',
                        body: `${disc.disciplina.split(' - ')[1] || disc.disciplina}: ${notaAtual} (${etapa}ª etapa)`,
                        tag: `nota-${notaKey}`,
                        url: '/dashboard.html#boletim',
                        actions: [{ action: 'ver', title: 'Ver Boletim' }]
                    }));
                    
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
                
                await webpush.sendNotification(userData.subscription, JSON.stringify({
                    title: '📝 Nova Avaliação Agendada!',
                    body: `${av.descricao || 'Prova'} em ${dias} dias`,
                    tag: `av-${avId}`,
                    url: '/dashboard.html#avaliacoes',
                    actions: [{ action: 'ver', title: 'Ver Avaliações' }]
                }));
                
                notificacoes++;
            }
        }
    } catch (err) {
        console.error('  ❌ Erro avaliações:', err.message);
    }

    userData.lastCheck = new Date();
    console.log(`  ✅ ${notificacoes} notificação(ões)\n`);
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