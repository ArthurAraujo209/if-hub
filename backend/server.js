const express = require('express');
const cors = require('cors');
const session = require('express-session');
const NodeCache = require('node-cache');

// ===== AMBIENTE =====
const isRender = process.env.RENDER === 'true' || Boolean(process.env.RENDER_SERVICE_ID);
const isProd = process.env.NODE_ENV === 'production' || isRender;

if (isRender && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

if (!isProd) {
  const fs = require('fs');
  const path = require('path');
  const dotenv = require('dotenv');

  const envPath = fs.existsSync(path.join(__dirname, '.env'))
    ? path.join(__dirname, '.env')
    : path.join(__dirname, '.env.local');

  dotenv.config({ path: envPath });
  console.log(`🔧 Variáveis carregadas de: ${envPath}`);
} else {
  console.log(`🚀 Produção — variáveis do ambiente`);
}

const { subscriptions, enviarFCM, iniciarCron } = require('./src/services/notifications');
const authRoutes  = require('./src/routes/auth');
const apiRoutes   = require('./src/routes/api');
const adminRoutes = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const cache = new NodeCache({ stdTTL: 300 });

// ===== MIDDLEWARES =====
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://if-hub-frontend.onrender.com',
    'https://simplifrn.vercel.app',
  ],
  credentials: true,
}));

app.use((req, res, next) => {
  const backendHost = req.hostname || '';
  const origin = req.get('origin') || req.get('referer') || '';
  const isLocal = backendHost.includes('localhost') || backendHost.includes('127.0.0.1') ||
                  origin.includes('localhost') || origin.includes('127.0.0.1');

  req.frontendURL = isLocal
    ? 'http://localhost:5500'
    : (process.env.FRONTEND_URL || 'https://simplifrn.vercel.app');
  req.environment = isLocal ? 'development' : 'production';
  next();
});

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'if-smart-secret-key',
  resave: false,
  saveUninitialized: false,
}));

// ===== ROTAS PÚBLICAS =====
app.get('/ping', (req, res) => res.send('pong'));

app.post('/api/notifications/subscribe', async (req, res) => {
  const { fcmToken, token } = req.body;
  if (!fcmToken || !token) return res.status(400).json({ erro: 'Dados incompletos' });

  subscriptions.set(token, {
    fcmToken,
    lastCheck: new Date(),
    lastNotas: new Map(),
    lastAvaliacoes: new Set(),
  });
  res.json({ success: true });
});

app.post('/api/notifications/unsubscribe', (req, res) => {
  subscriptions.delete(req.body.token);
  res.json({ success: true });
});

app.get('/api/notifications/status', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  res.json({ subscribed: subscriptions.has(token), total: subscriptions.size });
});

// ===== ROTAS DE TESTE (apenas em desenvolvimento) =====
if (!isProd) {
  app.get('/api/test/notificacao', async (req, res) => {
    if (subscriptions.size === 0) return res.json({ erro: 'Nenhum usuário inscrito' });
    let enviadas = 0;
    for (const [, userData] of subscriptions) {
      const ok = await enviarFCM(userData.fcmToken, {
        title: '🧪 Teste SIMPLIF',
        body: 'Suas notificações estão funcionando! 🎉',
        url: '/dashboard.html',
      });
      if (ok) enviadas++;
    }
    res.json({ enviadas, total: subscriptions.size });
  });

  app.get('/api/test/status', (req, res) => {
    const status = [...subscriptions.entries()].map(([token, data]) => ({
      token: token.substring(0, 20) + '...',
      fcmToken: data.fcmToken.substring(0, 30) + '...',
      lastCheck: data.lastCheck,
    }));
    res.json({ subscriptions: status, total: subscriptions.size });
  });

  app.get('/api/test/simular-avaliacao', async (req, res) => {
    if (subscriptions.size === 0) return res.json({ erro: 'Nenhum usuário inscrito' });
    for (const [, userData] of subscriptions) {
      await enviarFCM(userData.fcmToken, {
        title: '📝 Nova Avaliação Agendada!',
        body: 'Prova de Matemática em 7 dias (SIMULAÇÃO)',
        url: '/dashboard.html#avaliacoes',
      });
    }
    res.json({ simulado: true, para: subscriptions.size });
  });
}

// ===== ROTAS DA APLICAÇÃO =====
app.use('/auth', authRoutes);
app.use('/api', (req, res, next) => { req.cache = cache; next(); }, apiRoutes);
app.use('/admin', adminRoutes);

// ===== START =====
iniciarCron();

app.listen(PORT, () => {
  console.log(`✅ Backend rodando na porta ${PORT}`);
  console.log(`📡 Frontend: ${process.env.FRONTEND_URL || 'https://simplifrn.vercel.app'}`);
});