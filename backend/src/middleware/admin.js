const admin = require('firebase-admin');

module.exports = async function verificarAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // Verificar ID Token do Firebase
    const decoded = await admin.auth().verifyIdToken(token);

    // Buscar role no Firestore (fonte da verdade — não apenas no token)
    const db = admin.firestore();
    const usuarioSnap = await db.collection('usuarios').doc(decoded.uid).get();

    if (!usuarioSnap.exists) {
      return res.status(403).json({ erro: 'Usuário não encontrado' });
    }

    const usuario = usuarioSnap.data();

    if (usuario.role !== 'admin' && usuario.role !== 'admin_campus') {
      return res.status(403).json({ erro: 'Acesso negado — você não é administrador' });
    }

    req.adminUser = usuario;
    next();

  } catch (err) {
    console.error('Erro verificarAdmin:', err.message);
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
};