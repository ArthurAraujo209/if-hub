const admin = require('firebase-admin');

console.log("NODE_ENV =", process.env.NODE_ENV);
console.log("FIREBASE_PROJECT_ID =", process.env.FIREBASE_PROJECT_ID);
console.log("FIREBASE_CLIENT_EMAIL =", process.env.FIREBASE_CLIENT_EMAIL);
console.log(
  "ENV FIREBASE KEYS =",
  Object.keys(process.env).filter(k => k.includes("FIREBASE"))
);

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