// assets/js/firebase-init.js
// Inicializa Firebase e exporta os SDKs usados no frontend.
// ⚠️ A firebaseConfig abaixo DEVE ser idêntica à de firebase-messaging-sw.js
//    (o service worker usa SDK v9 compat e não consegue importar ESM).

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, signInWithCustomToken, onAuthStateChanged, signOut,
  browserLocalPersistence, setPersistence,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore, doc, getDoc, updateDoc, setDoc,
  onSnapshot, collection, getDocs,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getMessaging, getToken, deleteToken, onMessage,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js';

export const firebaseConfig = {
  apiKey:            'AIzaSyA1dkn0ftReTMChrrnYOmMRjtDUd_fDkz0',
  authDomain:        'if-smart.firebaseapp.com',
  projectId:         'if-smart',
  storageBucket:     'if-smart.firebasestorage.app',
  messagingSenderId: '544575127389',
  appId:             '1:544575127389:web:a7f2863fa74b9e743bf2b4',
};

const app       = initializeApp(firebaseConfig);
const auth      = getAuth(app);
const db        = getFirestore(app);
const messaging = getMessaging(app);

// Sessão persistente — não bloqueia o boot, só loga quando resolver
setPersistence(auth, browserLocalPersistence).catch(err =>
  console.warn('⚠️ Persistência falhou:', err.message)
);

export {
  auth, db, messaging,
  getToken, deleteToken, onMessage,
  signInWithCustomToken, onAuthStateChanged, signOut,
  doc, getDoc, updateDoc, setDoc, onSnapshot, collection, getDocs,
};