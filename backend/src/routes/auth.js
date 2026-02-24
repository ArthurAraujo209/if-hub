const express = require('express');
const router = express.Router();
const axios = require('axios');
const querystring = require('querystring');

// Carrega variáveis do .env
const SUAP_BASE_URL = process.env.SUAP_BASE_URL;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500';

console.log('FRONTEND_URL configurado:', FRONTEND_URL); // Debug

router.get('/login', (req, res) => {
    const authURL = `${SUAP_BASE_URL}/o/authorize/?` + querystring.stringify({
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
    });
    res.redirect(authURL);
});

router.get('/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
        console.log('Erro OAuth:', error);
        return res.redirect(`${FRONTEND_URL}/callback.html?error=${error}`);
    }

    if (!code) {
        return res.redirect(`${FRONTEND_URL}/callback.html?error=no_code`);
    }

    try {
        console.log('Trocando code por token...');
        
        const tokenRes = await axios.post(
            `${SUAP_BASE_URL}/o/token/`,
            querystring.stringify({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET
            }),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );

        const accessToken = tokenRes.data.access_token;
        console.log('Token obtido com sucesso!');
        
        // Salva na sessão
        req.session.accessToken = accessToken;

        // 🔴 IMPORTANTE: Redireciona para o FRONTEND, não para o backend
        const redirectURL = `${FRONTEND_URL}/callback.html?token=${accessToken}`;
        console.log('Redirecionando para:', redirectURL);
        
        res.redirect(redirectURL);

    } catch (err) {
        console.error('Erro ao obter token:', err.response?.data || err.message);
        res.redirect(`${FRONTEND_URL}/callback.html?error=auth_failed`);
    }
});

module.exports = router;