require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');

const authRoutes = require('./src/routes/auth');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS para permitir frontend em outra porta
app.use(cors({
    origin: ['http://localhost:5500', 'https://if-hub-frontend.onrender.com' , 'https://if-hub.netlify.app'],
    credentials: true
}));

app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'if-smart-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Rotas
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

app.listen(PORT, () => {
    console.log(`✅ Backend rodando em http://localhost:${PORT}`);
    console.log(`📡 Aguardando frontend em http://localhost:5500`);
});