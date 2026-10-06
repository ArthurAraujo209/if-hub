// assets/js/auth-guard.js
// Protege páginas logadas e disponibiliza window.IFHub = { usuario, campus, ... }.
// Carregar ANTES de dashboard.js via <script type="module" src="./assets/js/auth-guard.js">.

import { auth, db, onAuthStateChanged, doc, getDoc } from './firebase-init.js';
import { carregarCampus } from './campus.js';
import { escutarPreferencias } from './preferencias.js';

window.IFHub = window.IFHub || {};

// ---------------------------------------------------------------------------
// Busca o documento do usuário no Firestore.
// O backend cria o doc ANTES de emitir o custom token, então 3 tentativas
// curtas cobrem qualquer race. Retry agressivo (15 × delay progressivo) foi
// removido — na prática só adicionava segundos ao boot.
// ---------------------------------------------------------------------------
async function buscarUsuario(uid, tentativas = 3, delayMs = 400) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const snap = await getDoc(doc(db, 'usuarios', uid));
      if (snap.exists()) return snap.data();
    } catch (err) {
      if (err.code === 'permission-denied') throw err;
      console.warn(`Busca tentativa ${i + 1} falhou:`, err.message);
    }
    if (i < tentativas - 1) await new Promise(r => setTimeout(r, delayMs));
  }
  return null;
}

function usuarioFallback(user) {
  return {
    uid: user.uid,
    nome: user.displayName || 'Usuário',
    matricula: user.uid.replace('suap_', ''),
    campus_id: 'desconhecido',
    role: 'user',
    preferencias: { tema: 'dark', ordem_telas: [], notificacoes: true },
  };
}

function bloquearAcesso(nomeCampus) {
  const div = document.createElement('div');
  div.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.95);display:flex;
    align-items:center;justify-content:center;z-index:9999;color:#fff;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  `;
  div.innerHTML = `
    <div style="text-align:center;max-width:400px;padding:24px">
      <div style="font-size:4rem;margin-bottom:20px">🚫</div>
      <h1 style="margin-bottom:10px">Acesso Restrito</h1>
      <p style="color:rgba(255,255,255,.7);margin-bottom:12px">
        O campus <strong>${nomeCampus}</strong> está temporariamente desativado.
      </p>
      <p style="color:rgba(255,255,255,.55);font-size:.85rem">
        Contate o administrador do sistema.
      </p>
    </div>`;
  document.body.appendChild(div);
  document.body.style.overflow = 'hidden';
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '/index.html';
    return;
  }

  try {
    const usuario = (await buscarUsuario(user.uid)) || usuarioFallback(user);

    Object.assign(window.IFHub, { usuario, auth, db, firebaseUser: user });

    // Preferências rodam em background — não bloqueiam o boot
    escutarPreferencias((prefs) => {
      window.IFHub.preferencias = prefs;
      window.dispatchEvent(new CustomEvent('prefsAtualizadas', { detail: prefs }));
    });

    // Campus é o único dado que pode bloquear a renderização
    let campus = null;
    if (usuario.campus_id && usuario.campus_id !== 'desconhecido') {
      campus = await carregarCampus(usuario.campus_id);
    }

    if (campus?.ativo === false) {
      bloquearAcesso(campus.nome);
      return;
    }
    if (campus) window.IFHub.campus = campus;

    const nomeEl = document.getElementById('user-nome');
    if (nomeEl) nomeEl.textContent = usuario.nome;

    const fotoEl = document.getElementById('user-foto');
    if (fotoEl && usuario.foto_url) fotoEl.src = usuario.foto_url;

    window.dispatchEvent(new CustomEvent('ifhubPronto', { detail: { usuario, campus } }));
  } catch (err) {
    console.error('❌ Falha na autenticação:', err);
    window.location.href = '/index.html';
  }
});