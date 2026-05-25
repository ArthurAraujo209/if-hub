/**
 * user-sync.js - Sincroniza dados do usuário com Firestore ao fazer login
 * Salva: nome, email, foto, campus preferido, tema, e timestamps
 */

import { db, doc, getDoc, updateDoc, auth, onAuthStateChanged } from './firebase-init.js';

/**
 * Sincroniza dados do usuário com Firestore após login bem-sucedido
 * Executado uma única vez quando o usuário autentifica
 */
export async function sincronizarDadosUsuario() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          console.log('👤 Sincronizando dados do usuário:', user.uid);

          // 1. Buscar dados do SUAP via backend
          const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const backendURL = isDev ? 'http://localhost:3000' : 'https://if-hub-backend.onrender.com';
          
          let dadosSupap = null;
          try {
            const resSuap = await fetch(`${backendURL}/api/aluno`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('suap_token') || ''}`
              }
            });
            if (resSuap.ok) {
              const dataSuap = await resSuap.json();
              dadosSupap = dataSuap.aluno;
              console.log('✅ Dados SUAP obtidos:', { 
                nome: dadosSupap?.nome, 
                email: dadosSupap?.email_academico,
                matricula: dadosSupap?.matricula 
              });
            }
          } catch (err) {
            console.warn('⚠️  Erro ao buscar dados SUAP:', err.message);
          }

          // 2. Determinar foto (usar gravatar baseado no email ou padrão)
          const emailParaGravatar = user.email || (dadosSupap?.email_academico);
          const fotoUrl = emailParaGravatar 
            ? `https://www.gravatar.com/avatar/${btoa(emailParaGravatar.toLowerCase()).slice(0, 32)}?d=identicon`
            : null;

          // 3. Preparar dados do perfil
          const dadosPerfil = {
            uid: user.uid,
            nome: dadosSupap?.nome || user.displayName || 'Usuário',
            email: user.email || dadosSupap?.email_academico || 'desconhecido',
            email_academico: dadosSupap?.email_academico || null,
            matricula: dadosSupap?.matricula || null,
            foto_url: fotoUrl,
            campus_preferido: null,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // 4. Salvar/atualizar documento do usuário
          const userDocRef = doc(db, 'usuarios', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            // Atualizar: manter created_at, atualizar last_login
            await updateDoc(userDocRef, {
              ...dadosPerfil,
              created_at: userDocSnap.data().created_at || dadosPerfil.created_at,
            });
            console.log('✅ Perfil de usuário atualizado');
          } else {
            // Criar novo documento
            await updateDoc(userDocRef, dadosPerfil);
            console.log('✅ Perfil de usuário criado');
          }

          // 5. Sincronizar preferências (tema, campus preferido)
          const prefDocRef = doc(db, 'usuarios', user.uid, 'preferencias', 'config');
          const prefDocSnap = await getDoc(prefDocRef);

          const preferenciasPadrao = {
            tema: localStorage.getItem('pref_tema') || 'dark',
            campus_preferido: localStorage.getItem('campus_preferido') || null,
            notificacoes: true,
            updated_at: new Date().toISOString(),
          };

          if (!prefDocSnap.exists()) {
            // Criar preferências padrão
            await updateDoc(prefDocRef, preferenciasPadrao);
            console.log('✅ Preferências criadas com valores padrão');
          } else {
            // Atualizar timestamp
            await updateDoc(prefDocRef, { 
              updated_at: new Date().toISOString() 
            });
            console.log('✅ Preferências sincronizadas');
          }

          console.log('✅ SINCRONIZAÇÃO COMPLETA - Usuário pronto para usar o app');
          resolve(true);

        } catch (err) {
          console.error('❌ Erro ao sincronizar usuário:', err.message);
          console.error('   Stack:', err.stack);
          resolve(false);
        }
      } else {
        console.log('ℹ️  Usuário não autenticado');
        resolve(false);
      }

      // Desinscrever depois de processar
      unsubscribe();
    });
  });
}

/**
 * Atualiza tema do usuário no Firestore
 */
export async function atualizarTemaUsuario(novoTema) {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('⚠️  Usuário não autenticado, tema não salvo');
      return false;
    }

    const prefDocRef = doc(db, 'usuarios', user.uid, 'preferencias', 'config');
    await updateDoc(prefDocRef, {
      tema: novoTema,
      updated_at: new Date().toISOString(),
    });

    console.log('✅ Tema atualizado para:', novoTema);
    return true;
  } catch (err) {
    console.error('❌ Erro ao atualizar tema:', err.message);
    return false;
  }
}

/**
 * Atualiza campus preferido do usuário
 */
export async function atualizarCampusPreferido(campusId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('⚠️  Usuário não autenticado, campus não salvo');
      return false;
    }

    const userDocRef = doc(db, 'usuarios', user.uid);
    const prefDocRef = doc(db, 'usuarios', user.uid, 'preferencias', 'config');

    await Promise.all([
      updateDoc(userDocRef, {
        campus_preferido: campusId,
        updated_at: new Date().toISOString(),
      }),
      updateDoc(prefDocRef, {
        campus_preferido: campusId,
        updated_at: new Date().toISOString(),
      }),
    ]);

    console.log('✅ Campus preferido atualizado para:', campusId);
    return true;
  } catch (err) {
    console.error('❌ Erro ao atualizar campus preferido:', err.message);
    return false;
  }
}
