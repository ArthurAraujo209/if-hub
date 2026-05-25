/**
 * user-sync.js - Sincroniza dados do usuário com Firestore ao fazer login
 * Salva: nome, email, foto, campus preferido, tema, e timestamps
 * 
 * NOTA: Usa os mesmos nomes de campo que o backend já usa:
 * - criado_em (timestamp Firestore)
 * - ultimo_login (timestamp Firestore)
 * - campus_id (não campus_preferido)
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

          // 1. Buscar dados EXISTENTES do usuário (que o backend já criou)
          const userDocRef = doc(db, 'usuarios', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            console.warn('⚠️  Documento do usuário ainda não criado pelo backend. Aguardando...');
            resolve(false);
            return;
          }

          const dadosExistentes = userDocSnap.data();
          console.log('✅ Dados do usuário encontrados:', { 
            nome: dadosExistentes?.nome,
            campus_id: dadosExistentes?.campus_id,
            role: dadosExistentes?.role
          });

          // 2. Atualizar apenas ULTIMO_LOGIN (timestamp do Firestore)
          await updateDoc(userDocRef, {
            ultimo_login: new Date(), // Firestore vai converter para timestamp automaticamente
          });
          console.log('✅ Último login atualizado');

          // 3. Sincronizar preferências (tema, campus_id)
          const prefDocRef = doc(db, 'usuarios', user.uid, 'preferencias', 'config');
          const prefDocSnap = await getDoc(prefDocRef);

          const preferenciasPadrao = {
            tema: localStorage.getItem('pref_tema') || 'dark',
            notificacoes: true,
          };

          if (!prefDocSnap.exists()) {
            // Criar preferências padrão
            await updateDoc(prefDocRef, preferenciasPadrao);
            console.log('✅ Preferências criadas com valores padrão');
          } else {
            // Atualizar tema se mudou localmente
            const temaLocal = localStorage.getItem('pref_tema');
            if (temaLocal && temaLocal !== prefDocSnap.data().tema) {
              await updateDoc(prefDocRef, { tema: temaLocal });
              console.log('✅ Tema sincronizado');
            }
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
    });

    console.log('✅ Tema atualizado para:', novoTema);
    return true;
  } catch (err) {
    console.error('❌ Erro ao atualizar tema:', err.message);
    return false;
  }
}
