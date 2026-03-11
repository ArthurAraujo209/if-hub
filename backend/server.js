require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const axios = require('axios'); // ADICIONADO

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

        // Verifica se token é válido (opcional, mas recomendado)
        // Aqui usamos o próprio token como userId (simplificado)
        const userId = token; // ou gere um hash do token
        
        subscriptions.set(userId, {
            subscription,
            lastCheck: new Date(),
            lastNotas: new Map(),    // disciplina_etapa -> nota
            lastAvaliacoes: new Set() // ids de avaliações
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

// ===== CRON JOB - VERIFICAÇÃO PERIÓDICA =====
// Roda a cada 30 minutos
cron.schedule('*/30 * * * *', async () => {
    console.log('🔍 Verificando novidades no SUAP...', new Date().toISOString());
    
    if (subscriptions.size === 0) {
        console.log('Nenhum usuário inscrito');
        return;
    }

    for (const [userId, userData] of subscriptions) {
        try {
            await verificarNovidades(userId, userData);
        } catch (err) {
            console.error(`Erro ao verificar ${userId.substring(0, 20)}:`, err.message);
        }
    }
});

// Função que verifica novidades no SUAP
async function verificarNovidades(userId, userData) {
    const { SUAP_BASE_URL } = process.env;
    const token = userId; // simplificado - em produção use refresh token
    
    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
    };

    const anoAtual = new Date().getFullYear();
    let notificacoesEnviadas = 0;

    // ===== 1. VERIFICAR NOTAS NOVAS =====
    try {
        const boletimRes = await axios.get(
            `${SUAP_BASE_URL}/api/ensino/meu-boletim/${anoAtual}/1/`,
            { headers, timeout: 10000 }
        );

        const disciplinas = boletimRes.data?.results || [];

        for (const disc of disciplinas) {
            // Verifica etapas 1 e 2 (ajuste se necessário)
            for (let etapa = 1; etapa <= 2; etapa++) {
                const notaKey = `${disc.codigo_diario}_etapa${etapa}`;
                const notaAtual = disc[`nota_etapa_${etapa}`]?.nota;
                const notaAnterior = userData.lastNotas.get(notaKey);

                // NOTA NOVA: tem nota agora e não tinha antes
                if (notaAtual !== null && notaAtual !== undefined && notaAnterior === undefined) {
                    
                    // Salva nova nota
                    userData.lastNotas.set(notaKey, notaAtual);
                    
                    // Envia notificação
                    await enviarNotificacao(userData.subscription, {
                        title: '📊 Nota Publicada!',
                        body: `${disc.disciplina.split(' - ')[1] || disc.disciplina}: ${notaAtual} (${etapa}ª etapa)`,
                        tag: `nota-${notaKey}`,
                        url: '/dashboard.html#boletim',
                        actions: [
                            { action: 'ver', title: 'Ver Boletim' }
                        ]
                    });
                    
                    notificacoesEnviadas++;
                    console.log(`📤 Notificação de nota enviada: ${disc.disciplina}`);
                }
            }
        }
    } catch (err) {
        if (err.response?.status === 401) {
            console.log(`Token expirado para ${userId.substring(0, 20)}...`);
            // Opcional: remover subscription ou marcar para reautenticação
        } else {
            console.error('Erro boletim:', err.message);
        }
    }

    // ===== 2. VERIFICAR AVALIAÇÕES NOVAS =====
    try {
        const avalRes = await axios.get(
            `${SUAP_BASE_URL}/api/ensino/minhas-proximas-avaliacoes/`,
            { headers, timeout: 10000 }
        );

        const avaliacoes = avalRes.data?.results || [];

        for (const av of avaliacoes) {
            const avId = av.id.toString();
            
            // AVALIAÇÃO NOVA: não existia no último check
            if (!userData.lastAvaliacoes.has(avId)) {
                userData.lastAvaliacoes.add(avId);
                
                const dataProva = new Date(av.data);
                const hoje = new Date();
                const diasFaltando = Math.ceil((dataProva - hoje) / (1000 * 60 * 60 * 24));
                
                await enviarNotificacao(userData.subscription, {
                    title: '📝 Nova Avaliação!',
                    body: `${av.descricao || 'Prova'} em ${diasFaltando} dias (${formatarData(av.data)})`,
                    tag: `avaliacao-${avId}`,
                    url: '/dashboard.html#avaliacoes',
                    actions: [
                        { action: 'ver', title: 'Ver Avaliações' }
                    ]
                });
                
                notificacoesEnviadas++;
                console.log(`📤 Notificação de avaliação enviada: ${av.descricao}`);
            }
        }
    } catch (err) {
        console.error('Erro avaliações:', err.message);
    }

    userData.lastCheck = new Date();
    
    if (notificacoesEnviadas > 0) {
        console.log(`✅ ${notificacoesEnviadas} notificação(ões) enviada(s) para ${userId.substring(0, 20)}...`);
    }
}

// Helper: enviar notificação push
async function enviarNotificacao(subscription, data) {
    try {
        await webpush.sendNotification(subscription, JSON.stringify(data));
        return true;
    } catch (err) {
        console.error('Erro ao enviar push:', err.statusCode, err.message);
        
        // Subscription expirada ou inválida
        if (err.statusCode === 410 || err.statusCode === 404) {
            console.log('Subscription expirada, removendo...');
            // Remove do map (precisaria do userId aqui, simplificado)
        }
        return false;
    }
}

// Helper: formatar data
function formatarData(dataStr) {
    return new Date(dataStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short'
    });
}

// ===== ROTAS PRINCIPAIS =====
app.use('/auth', authRoutes);

app.use('/api', (req, res, next) => {
    req.cache = cache;
    next();
}, apiRoutes);

app.listen(PORT, () => {
    console.log(`✅ Backend rodando em http://localhost:${PORT}`);
    console.log(`📡 Aguardando frontend em http://localhost:5500`);
    console.log(`🔔 Notificações: ${subscriptions.size} inscritos`);
    console.log(`⏰ Cron job: a cada 30 minutos`);
});