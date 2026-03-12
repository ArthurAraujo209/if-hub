require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const axios = require('axios');
const admin = require('firebase-admin');

// Inicializar com service account
// Baixe o arquivo JSON em: Firebase Console → Configurações → Contas de serviço
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

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

// Armazena: token -> {fcmToken, lastCheck}
const subscriptions = new Map();

// Inscrever
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
    console.error('Erro:', err);
    res.status(500).json({ erro: err.message });
  }
});

// Cancelar
app.post('/api/notifications/unsubscribe', (req, res) => {
  const { token } = req.body;
  subscriptions.delete(token);
  console.log(`❌ Removido`);
  res.json({ success: true });
});

// Status
app.get('/api/notifications/status', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  res.json({ 
    subscribed: subscriptions.has(token),
    total: subscriptions.size
  });
});

// Enviar notificação via FCM
async function enviarNotificacaoFCM(fcmToken, data) {
  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: data.title,
        body: data.body,
        imageUrl: 'https://if-hub.netlify.app/assets/icons/IF HUB - SEM FUNDO - 192x192.png'
      },
      data: {
        url: data.url || '/dashboard.html',
        tag: data.tag || 'default'
      },
      webpush: {
        fcmOptions: {
          link: 'https://if-hub.netlify.app' + (data.url || '/dashboard.html')
        },
        notification: {
          icon: 'https://if-hub.netlify.app/assets/icons/IF HUB - SEM FUNDO - 192x192.png',
          badge: 'https://if-hub.netlify.app/assets/icons/badge-72x72.png',
          actions: data.actions ? data.actions.map(a => ({
            action: a.action,
            title: a.title
          })) : undefined
        }
      }
    });
    console.log('✅ FCM enviado');
    return true;
    
  } catch (err) {
    console.error('❌ Erro FCM:', err.code, err.message);
    if (err.code === 'messaging/registration-token-not-registered') {
      // Token inválido, remover
      return false;
    }
    return false;
  }
}

// Cron job
cron.schedule('*/30 * * * *', async () => {
  console.log('🔍 Verificando...', new Date().toLocaleTimeString());
  
  for (const [token, userData] of subscriptions) {
    try {
      await verificarNovidades(token, userData);
    } catch (err) {
      console.error('Erro:', err.message);
    }
  }
});

// Verificar novidades (mesma lógica de antes, mas com FCM)
async function verificarNovidades(token, userData) {
  const { SUAP_BASE_URL } = process.env;
  const headers = { Authorization: `Bearer ${token}` };
  const anoAtual = new Date().getFullYear();
  let notificacoes = 0;

  console.log(`\n🔍 ${token.substring(0, 20)}...`);

  // Verificar NOTAS (simplificado)
  try {
    const boletimRes = await axios.get(
      `${SUAP_BASE_URL}/api/ensino/meu-boletim/${anoAtual}/1/`,
      { headers, timeout: 10000 }
    );

    const disciplinas = boletimRes.data?.results || [];

    for (const disc of disciplinas) {
      for (let etapa = 1; etapa <= 4; etapa++) {
        const notaKey = `${disc.codigo_diario}_etapa${etapa}`;
        const notaAtual = disc[`nota_etapa_${etapa}`]?.nota;
        const notaAnterior = userData.lastNotas.get(notaKey);

        if (notaAtual !== null && notaAtual !== undefined && notaAnterior === undefined) {
          console.log(`    🔔 Nota nova: ${disc.disciplina}`);
          
          userData.lastNotas.set(notaKey, notaAtual);
          
          await enviarNotificacaoFCM(userData.fcmToken, {
            title: '📊 Nota Publicada!',
            body: `${disc.disciplina}: ${notaAtual} (${etapa}ª etapa)`,
            tag: `nota-${notaKey}`,
            url: '/dashboard.html#boletim',
            actions: [{ action: 'ver', title: 'Ver Boletim' }]
          });
          
          notificacoes++;
        }
      }
    }
  } catch (err) {
    console.log(`  ⚠️ Erro boletim: ${err.message}`);
  }

  // Verificar AVALIAÇÕES (simplificado)
  try {
    const avalRes = await axios.get(
      `${SUAP_BASE_URL}/api/ensino/minhas-proximas-avaliacoes/`,
      { headers, timeout: 10000 }
    );

    const avaliacoes = avalRes.data?.results || [];

    for (const av of avaliacoes) {
      const avId = av.id.toString();
      
      if (!userData.lastAvaliacoes.has(avId)) {
        console.log(`    🔔 Avaliação nova: ${av.descricao}`);
        
        userData.lastAvaliacoes.add(avId);
        
        const dias = Math.ceil((new Date(av.data) - new Date()) / (1000 * 60 * 60 * 24));
        
        await enviarNotificacaoFCM(userData.fcmToken, {
          title: '📝 Nova Avaliação!',
          body: `${av.descricao || 'Prova'} em ${dias} dias`,
          tag: `av-${avId}`,
          url: '/dashboard.html#avaliacoes',
          actions: [{ action: 'ver', title: 'Ver Avaliações' }]
        });
        
        notificacoes++;
      }
    }
  } catch (err) {
    console.log(`  ⚠️ Erro avaliações: ${err.message}`);
  }

  userData.lastCheck = new Date();
  console.log(`  ✅ ${notificacoes} notificação(ões)\n`);
}

// Rotas de teste
app.get('/api/test/notificacao', async (req, res) => {
  if (subscriptions.size === 0) {
    return res.json({ erro: 'Nenhum inscrito' });
  }

  let enviadas = 0;
  for (const [token, userData] of subscriptions) {
    const sucesso = await enviarNotificacaoFCM(userData.fcmToken, {
      title: '🧪 Teste IF HUB',
      body: 'Suas notificações estão funcionando! 🎉',
      url: '/dashboard.html'
    });
    if (sucesso) enviadas++;
  }
  
  res.json({ enviadas, total: subscriptions.size });
});

app.get('/api/test/status', (req, res) => {
  const status = Array.from(subscriptions.entries()).map(([token, data]) => ({
    token: token.substring(0, 20) + '...',
    fcmToken: data.fcmToken.substring(0, 30) + '...',
    lastCheck: data.lastCheck
  }));
  res.json({ subscriptions: status, total: subscriptions.size });
});

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