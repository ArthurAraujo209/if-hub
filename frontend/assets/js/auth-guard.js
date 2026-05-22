// auth-guard.js — Protege páginas que exigem login
// Adicione no <head> de dashboard.html, admin.html e qualquer página protegida:
// <script type="module" src="./assets/js/auth-guard.js"></script>

import { auth, db, onAuthStateChanged, doc, getDoc } from './firebase-init.js';

// Exportar usuário e campus para uso no dashboard.js e outros scripts
window.IFHub = window.IFHub || {};

// Importar funções auxiliares com tratamento de erro
let carregarCampus = null;
let escutarPreferencias = null;

(async () => {
  try {
    const campusModule = await import('./campus.js');
    carregarCampus = campusModule.carregarCampus;
    console.log('✅ campus.js carregado');
  } catch (err) {
    console.warn('⚠️  campus.js não pôde ser carregado:', err.message);
  }

  try {
    const prefsModule = await import('./preferencias.js');
    escutarPreferencias = prefsModule.escutarPreferencias;
    console.log('✅ preferencias.js carregado');
  } catch (err) {
    console.warn('⚠️  preferencias.js não pôde ser carregado:', err.message);
  }
})();

onAuthStateChanged(auth, async (user) => {
  console.log('═════════════════════════════════════════');
  console.log('🔐 AUTH STATE CHANGED');
  console.log('═════════════════════════════════════════');
  
  if (!user) {
    // Não está logado — redirecionar para login
    console.log('🔒 Não autenticado — redirecionando para login');
    window.location.href = '/index.html';
    return;
  }

  console.log('🔓 Usuário autenticado');
  console.log('   UID:', user.uid);
  console.log('   Email:', user.email);
  console.log('   Provider:', user.providerData);

  
  // Função auxiliar: tentar buscar usuário com retry
  async function buscarUsuarioComRetry(uid, maxTentativas = 15, delayMs = 800) {
    console.log('🔍 INICIANDO BUSCA DE USUÁRIO');
    console.log('   Procurando por UID:', uid);
    console.log('   Coleção: usuarios');
    console.log('   Tentativas: até', maxTentativas, 'com delays progressivos');
    console.log('   Delay inicial:', delayMs, 'ms');
    
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      try {
        console.log(`\n   [${tentativa}/${maxTentativas}] Tentando buscar...`);
        const usuarioSnap = await getDoc(doc(db, 'usuarios', uid));
        
        if (usuarioSnap.exists()) {
          console.log(`   ✅ ENCONTRADO NA TENTATIVA ${tentativa}!`);
          console.log('   Dados:', usuarioSnap.data());
          return usuarioSnap.data();
        }
        
        console.log(`   ❌ Documento não existe ainda`);
        
        if (tentativa < maxTentativas) {
          const proximoDelay = delayMs * tentativa; // Aumentar delay progressivamente
          console.log(`   ⏳ Aguardando ${proximoDelay}ms antes de tentar novamente...`);
          console.log(`   Tempo total decorrido: ${(delayMs * (tentativa - 1) + proximoDelay) / 1000}s`);
          await new Promise(resolve => setTimeout(resolve, proximoDelay));
        }
      } catch (err) {
        console.error(`   ❌ ERRO na tentativa ${tentativa}:`, err.message);
        console.error('      Código:', err.code);

        // permission-denied = token expirado, não adianta tentar mais vezes
        if (err.code === 'permission-denied') {
          console.error('   🔒 Permissão negada — sessão expirada. Redirecionando...');
          window.location.href = '/index.html';
          return null;
        }

        if (tentativa === maxTentativas) throw err;
        const proximoDelay = delayMs * tentativa;
        console.log(`   ⏳ Aguardando ${proximoDelay}ms antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, proximoDelay));
      }
    }
    
    console.log('❌ FALHA APÓS', maxTentativas, 'TENTATIVAS - Documento não foi encontrado no Firestore');
    return null;
  }

  try {
    // Renovar ID Token do Firebase antes de qualquer operação no Firestore
    // Isso evita erros de permission-denied após 1 hora de sessão
    console.log('🔄 Renovando ID Token do Firebase...');
    try {
      await user.getIdToken(true); // true = força renovação
      console.log('   ✅ ID Token renovado com sucesso');
    } catch (tokenErr) {
      console.warn('   ⚠️ Não foi possível renovar token:', tokenErr.message);
    }

    // Buscar dados do usuário no Firestore com retry
    console.log('🔍 Iniciando busca de usuário...');
    const usuario = await buscarUsuarioComRetry(user.uid);

    if (!usuario) {
      console.error('❌ ERRO CRÍTICO: Usuário não encontrado no Firestore');
      console.warn('⚠️  FALLBACK: Criando usuário básico para permitir acesso...');
      
      // Fallback: criar usuário básico com dados do Firebase
      const usuarioFallback = {
        uid: user.uid,
        nome: user.displayName || 'Usuário',
        email: user.email || 'não informado',
        matricula: user.uid.replace('suap_', ''),
        campus_id: 'desconhecido',
        role: 'user',
        campus_admin: null,
        preferencias: {
          tema: 'dark',
          ordem_telas: [],
          notificacoes: true,
        },
        aviso_firestore: '⚠️ Usuário carregado em modo fallback - documento não encontrado no Firestore',
      };
      
      console.warn('📋 Usuário fallback:', usuarioFallback);
      
      window.IFHub.usuario  = usuarioFallback;
      window.IFHub.auth     = auth;
      window.IFHub.db       = db;
      window.IFHub.firebaseUser = user;

      // Preencher nome do usuário na interface
      const nomeEl = document.getElementById('user-nome');
      if (nomeEl) nomeEl.textContent = usuarioFallback.nome;

      window.dispatchEvent(new CustomEvent('ifhubPronto', { detail: { usuario: usuarioFallback, campus: null } }));

      console.log('\n═════════════════════════════════════════');
      console.log('⚠️  IF-HUB PRONTO (MODO FALLBACK)');
      console.log('═════════════════════════════════════════\n');
      return;
    }

    console.log('\n✅ SUCESSO NA BUSCA DO USUÁRIO');
    console.log('👤 Dados carregados:', usuario);

    // Disponibilizar globalmente para outros scripts
    window.IFHub.usuario  = usuario;
    window.IFHub.auth     = auth;
    window.IFHub.db       = db;
    window.IFHub.firebaseUser = user;

    // Carregar configuração do campus e aplicar features
    console.log('\n📍 Carregando campus:', usuario.campus_id);
    let campus = null;
    try {
      if (typeof carregarCampus === 'function') {
        console.log('   Chamando carregarCampus...');
        campus = await carregarCampus(usuario.campus_id);
        if (campus) {
          window.IFHub.campus = campus;
          console.log('   ✅ Campus carregado com sucesso');
        } else {
          console.log('   ℹ️  Campus não está configurado no Firestore');
        }
      } else {
        console.warn('⚠️  Função carregarCampus não disponível');
      }
    } catch (campusErr) {
      console.error('❌ Erro ao carregar campus:', campusErr.message);
      console.error('   Continuando sem dados do campus...');
    }

    // Sincronizar preferências em tempo real
    console.log('\n⚙️  Sincronizando preferências...');
    try {
      if (typeof escutarPreferencias === 'function') {
        console.log('   Chamando escutarPreferencias...');
        const unsubscribe = escutarPreferencias((prefs) => {
          window.IFHub.preferencias = prefs;
          window.dispatchEvent(new CustomEvent('prefsAtualizadas', { detail: prefs }));
        });
        console.log('   ✅ Listener de preferências ativo');
      } else {
        console.warn('⚠️  Função escutarPreferencias não disponível');
      }
    } catch (prefsErr) {
      console.error('❌ Erro ao sincronizar preferências:', prefsErr.message);
      console.error('   Continuando sem sincronização de preferências...');
    }

    // Preencher nome do usuário na interface (se existir o elemento)
    const nomeEl = document.getElementById('user-nome');
    if (nomeEl) nomeEl.textContent = usuario.nome;

    const fotoEl = document.getElementById('user-foto');
    if (fotoEl && usuario.foto) fotoEl.src = usuario.foto;

    // Disparar evento: autenticação concluída, app pode inicializar
    window.dispatchEvent(new CustomEvent('ifhubPronto', { detail: { usuario, campus } }));

    console.log('\n═════════════════════════════════════════');
    console.log('✅ IF-HUB PRONTO');
    console.log('═════════════════════════════════════════\n');

  } catch (err) {
    console.error('\n❌ ERRO NA INICIALIZAÇÃO');
    console.error('   Mensagem:', err.message);
    console.error('   Código:', err.code);
    console.error('   Stack:', err.stack);
    console.error('   Redirecionando para login...');
    window.location.href = '/index.html';
  }
});