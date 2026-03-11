require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');

// ===== ADICIONADO =====
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 });
// ======================

const authRoutes = require('./src/routes/auth');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS para permitir frontend em outra porta
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

// ===== ADICIONADO (ping para evitar cold start) =====
app.get('/ping', (req, res) => {
    res.json({ status: 'online' });
});
// ====================================================

// Rotas
app.use('/auth', authRoutes);

// ===== ALTERADO (passando cache para as rotas) =====
app.use('/api', (req, res, next) => {
    req.cache = cache;
    next();
}, apiRoutes);
// ================================================

app.listen(PORT, () => {
    console.log(`✅ Backend rodando em http://localhost:${PORT}`);
    console.log(`📡 Aguardando frontend em http://localhost:5500`);
});