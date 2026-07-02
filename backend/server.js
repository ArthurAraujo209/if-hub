const express = require('express');
const cors = require('cors');
const session = require('express-session');
const NodeCache = require('node-cache');

// ===== CONFIGURAÇÃO DE AMBIENTE =====
// Em produção (Render), as variáveis já estão no process.env, não precisamos de arquivo .env
if (process.env.NODE_ENV !== 'production') {
  const fs = require('fs');
  const path = require('path');
  const dotenv = require('dotenv');

  const envPath = fs.existsSync(path.join(__dirname, '.env'))
    ? path.join(__dirname, '.env')
    : path.join(__dirname, '.env.local');

  dotenv.config({ path: envPath });
  console.log(`🔧 Carregando variáveis de ambiente de: ${envPath}`);
} else {
  console.log(`🚀 Ambiente de Produção Detectado: Usando variáveis do Render`);
}

const { subscriptions, enviarFCM, iniciarCron } = require('./src/services/notifications');
const authRoutes  = require('./src/routes/auth');
const apiRoutes   = require('./src/routes/api');
const adminRoutes = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const cache = new NodeCache({ stdTTL: 300 });

console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT'}`);

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

  if (backendHost.includes('localhost') || backendHost.includes('127.0.0.1') ||
      origin.includes('localhost') || origin.includes('127.0.0.1')) {
    req.frontendURL = 'http://localhost:5500';
    req.environment = 'development';
  } else {
    req.frontendURL = process.env.FRONTEND_URL || 'https://simplifrn.vercel.app';
    req.environment = 'production';
  }
  next();
});

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'if-smart-secret-key',
  resave: false,
  saveUninitialized: false,
}));

// ===== ROTAS =====
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
  console.log(`✅ Inscrito: ${fcmToken.substring(0, 30)}...`);
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

app.use('/auth', authRoutes);
app.use('/api', (req, res, next) => { req.cache = cache; next(); }, apiRoutes);
app.use('/admin', adminRoutes);

// ===== START =====
iniciarCron();

app.listen(PORT, () => {
  console.log(`✅ Backend rodando em http://localhost:${PORT}`);
  console.log(`📡 Frontend: ${process.env.FRONTEND_URL}`);
  console.log(`⏰ Cron de notificações iniciado`);
});   

console.log("NODE_ENV =", process.env.NODE_ENV);
console.log("FIREBASE_PROJECT_ID =", process.env.FIREBASE_PROJECT_ID);
console.log("FIREBASE_CLIENT_EMAIL =", process.env.FIREBASE_CLIENT_EMAIL);
console.log(
  "ENV FIREBASE KEYS =",
  Object.keys(process.env).filter(k => k.includes("FIREBASE"))
);