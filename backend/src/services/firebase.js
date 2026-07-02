const admin = require('firebase-admin');

// DEBUG: Remova isso após corrigir
console.log('🔍 DEBUG ENV:', {
  hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
  hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
  hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
  privateKeyStart: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.substring(0, 20) : 'N/A'
});

if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
        throw new Error('❌ Variáveis do Firebase ausentes no .env');
    }

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey,
        }),
    });
}

module.exports = admin;