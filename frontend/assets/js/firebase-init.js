// ============================================================
// ATENÇÃO: Preencha os campos abaixo com os dados do seu projeto Firebase
// Para encontrar esses valores:
// 1. Acesse https://console.firebase.google.com
// 2. Selecione o projeto "if-smart"
// 3. Clique na engrenagem → Configurações do projeto
// 4. Role até "Seus apps" → SDK do Firebase → Configuração
// ============================================================

import { initializeApp }                          from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithCustomToken,
         onAuthStateChanged, signOut,
         browserLocalPersistence, setPersistence } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc,
         updateDoc, setDoc, onSnapshot,
         collection, getDocs }                    from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyA1dkn0ftReTMChrrnYOmMRjtDUd_fDkz0",
  authDomain:        "if-smart.firebaseapp.com",
  projectId:         "if-smart",
  storageBucket:     "if-smart.firebasestorage.app",
  messagingSenderId: "544575127389",
  appId:             "1:544575127389:web:a7f2863fa74b9e743bf2b4",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Sessão persistente: usuário fica logado semanas (até fazer logout explícito)
setPersistence(auth, browserLocalPersistence)
  .then(() => console.log('✅ Persistência de sessão ativada'))
  .catch(err => console.warn('⚠️  Erro ao ativar persistência:', err.message));

// Exportar para uso nos outros arquivos JS
export {
  auth,
  db,
  signInWithCustomToken,
  onAuthStateChanged,
  signOut,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  onSnapshot,
  collection,
  getDocs,
};