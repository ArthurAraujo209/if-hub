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

        if (err.code === 'permission-denied') {
          console.error('   🔒 Custom Token expirado — renovando sessão...');
          try {
            const backendURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
              ? 'http://localhost:3000'
              : 'https://if-hub-backend.onrender.com';

            const tokenRes = await fetch(`${backendURL}/auth/token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid: user.uid }),
            });

            if (!tokenRes.ok) throw new Error('Falha ao obter novo token');

            const { firebase_token } = await tokenRes.json();
            const { signInWithCustomToken } = await import('./firebase-init.js');
            await signInWithCustomToken(auth, firebase_token);
            console.log('   ✅ Sessão renovada, continuando...');
            continue;
          } catch (renewErr) {
            console.error('   ❌ Não foi possível renovar sessão:', renewErr.message);
            window.location.href = '/index.html';
            return null;
          }
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
          
          // 🚫 BLOQUEAR ACESSO SE CAMPUS INATIVO
          if (campus.ativo === false) {
            console.error('\n🚫 ACESSO BLOQUEADO');
            console.error(`   Campus "${campus.nome}" está INATIVO`);
            const msgDiv = document.createElement('div');
            msgDiv.style.cssText = `
              position: fixed; top: 0; left: 0; width: 100%; height: 100%;
              background: rgba(0,0,0,0.95); display: flex; align-items: center; justify-content: center;
              z-index: 9999; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            `;
            msgDiv.innerHTML = `
              <div style="text-align: center; max-width: 400px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">🚫</div>
                <h1 style="margin-bottom: 10px;">Acesso Restrito</h1>
                <p style="color: rgba(255,255,255,0.7); margin-bottom: 20px;">
                  O campus <strong>${campus.nome}</strong> está temporariamente desativado.
                </p>
                <p style="color: rgba(255,255,255,0.6); font-size: 0.9rem;">
                  Entre em contato com o administrador do sistema para mais informações.
                </p>
              </div>
            `;
            document.body.appendChild(msgDiv);
            document.body.style.overflow = 'hidden';
            throw new Error(`Campus ${campus.nome} está inativo`);
          }
        } else {
          console.log('   ℹ️  Campus não está configurado no Firestore');
        }
      } else {
        console.warn('⚠️  Função carregarCampus não disponível');
      }
    } catch (campusErr) {
      console.error('❌ Erro ao carregar campus:', campusErr.message);
      if (campusErr.message.includes('inativo')) {
        // Já mostrou a mensagem de bloqueio
        return;
      }
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