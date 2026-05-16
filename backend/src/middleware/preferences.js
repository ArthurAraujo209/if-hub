// preferencias.js — Salva e sincroniza preferências do usuário no Firestore
import { db, auth, doc, updateDoc, onSnapshot } from './firebase-init.js';

let cancelarListener = null;

// ============================================================
// Salvar uma preferência específica
// Uso: await salvarPreferencia('tema', 'ocean')
//      await salvarPreferencia('notificacoes', false)
//      await salvarPreferencia('ordem_telas', ['horarios', 'mapa'])
// ============================================================
export async function salvarPreferencia(chave, valor) {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    console.warn('salvarPreferencia: usuário não logado');
    return;
  }

  try {
    // Dot notation: atualiza só o campo sem sobrescrever o resto
    await updateDoc(doc(db, 'usuarios', uid), {
      [`preferencias.${chave}`]: valor,
    });

    // Salvar também em localStorage como cache local (evita flash no carregamento)
    try { localStorage.setItem(`pref_${chave}`, JSON.stringify(valor)); } catch {}

    console.log(`✅ Preferência salva: ${chave} =`, valor);
  } catch (err) {
    console.error('❌ Erro ao salvar preferência:', err);
  }
}

// ============================================================
// Escutar preferências em tempo real (atualiza se mudar em outro device)
// callback recebe o objeto completo de preferências
// ============================================================
export function escutarPreferencias(callback) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  // Cancelar listener anterior se existir
  if (cancelarListener) {
    cancelarListener();
    cancelarListener = null;
  }

  cancelarListener = onSnapshot(doc(db, 'usuarios', uid), (snap) => {
    if (!snap.exists()) return;

    const prefs = snap.data()?.preferencias || {};
    console.log('🔄 Preferências sincronizadas:', prefs);

    // Aplicar tema imediatamente
    if (prefs.tema) aplicarTema(prefs.tema);

    callback(prefs);
  });
}

// ============================================================
// Parar de escutar (chamar ao fazer logout)
// ============================================================
export function pararEscutarPreferencias() {
  if (cancelarListener) {
    cancelarListener();
    cancelarListener = null;
  }
}

// ============================================================
// Aplicar tema no documento
// ============================================================
export function aplicarTema(tema) {
  document.documentElement.setAttribute('data-theme', tema);
  try { localStorage.setItem('pref_tema', JSON.stringify(tema)); } catch {}
}

// ============================================================
// Ler tema do cache local (usar no <head> para evitar flash)
// Não precisa importar — adicione diretamente no <head> das páginas:
//
// <script>
//   try {
//     const tema = JSON.parse(localStorage.getItem('pref_tema')) || 'dark';
//     document.documentElement.setAttribute('data-theme', tema);
//   } catch {}
// </script>
// ============================================================