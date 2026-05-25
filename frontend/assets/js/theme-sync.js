/**
 * theme-sync.js - Sincroniza seleção de tema com Firestore
 * Detecta mudanças de tema e salva no Firestore em tempo real
 */

import { db, doc, updateDoc, auth } from './firebase-init.js';
import { atualizarTemaUsuario } from './user-sync.js';

/**
 * Inicializa o sistema de sincronização de tema
 */
export function inicializarSincronizacaoTema() {
  console.log('🎨 Inicializando sincronização de tema...');

  // Recuperar tema do localStorage se disponível
  const temaSalvo = localStorage.getItem('pref_tema') || 'dark';
  
  // Monitorar mudanças de seleção de tema
  const observer = new MutationObserver(() => {
    const selectTema = document.getElementById('theme-select');
    if (selectTema) {
      selectTema.addEventListener('change', (e) => {
        const novoTema = e.target.value;
        console.log('🎨 Tema mudou para:', novoTema);
        salvarTema(novoTema);
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  return observer;
}

/**
 * Salva tema do usuário em localStorage e Firestore
 */
export async function salvarTema(novoTema) {
  try {
    // Salvar localmente
    localStorage.setItem('pref_tema', novoTema);
    console.log('✅ Tema salvo localmente:', novoTema);

    // Salvar no Firestore se usuário está autenticado
    const user = auth.currentUser;
    if (user) {
      const sucesso = await atualizarTemaUsuario(novoTema);
      if (sucesso) {
        console.log('✅ Tema sincronizado com Firestore');
      }
    } else {
      console.log('ℹ️  Usuário não autenticado, tema apenas no localStorage');
    }

    return true;
  } catch (err) {
    console.error('❌ Erro ao salvar tema:', err.message);
    return false;
  }
}

/**
 * Recupera tema salvo do usuário
 */
export function recuperarTemaUsuario() {
  const tema = localStorage.getItem('pref_tema') || 'dark';
  console.log('🎨 Tema recuperado:', tema);
  return tema;
}

/**
 * Aplica tema ao documento
 */
export function aplicarTema(nomeDoTema) {
  try {
    document.documentElement.setAttribute('data-theme', nomeDoTema);
    localStorage.setItem('pref_tema', nomeDoTema);
    console.log('✅ Tema aplicado:', nomeDoTema);
  } catch (err) {
    console.error('❌ Erro ao aplicar tema:', err.message);
  }
}
