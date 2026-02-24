// Middleware reutilizável (já está em api.js, mas se quiser separar)
const axios = require('axios');
const { SUAP_BASE_URL } = process.env;

const verificarToken = async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.accessToken;
    
    if (!token) {
        return res.status(401).json({ erro: 'Token não fornecido' });
    }

    try {
        // Testa se token é válido fazendo uma requisição ao SUAP
        await axios.get(`${SUAP_BASE_URL}/api/ensino/meus-dados-aluno/`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        req.token = token;
        next();
    } catch (err) {
        return res.status(401).json({ erro: 'Token inválido ou expirado' });
    }
};

module.exports = { verificarToken };