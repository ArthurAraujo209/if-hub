import { db, doc, onSnapshot, auth } from './firebase-init.js';

export function escutarPreferencias(callback) {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      console.warn('⚠️  Usuário não autenticado, preferências não serão sincronizadas');
      return () => {};
    }

    console.log('📋 Tentando sincronizar preferências para UID:', user.uid);

    // Listener para o documento de preferências
    const unsubscribe = onSnapshot(
      doc(db, 'usuarios', user.uid, 'preferencias', 'config'),
      (snap) => {
        if (snap.exists()) {
          console.log('✅ Preferências encontradas:', snap.data());
          callback(snap.data());
        } else {
          console.log('ℹ️  Documento de preferências não encontrado, usando padrão');
          callback({
            tema: 'dark',
            ordem_telas: [],
            notificacoes: true,
          });
        }
      },
      (err) => {
        // Erro ao escutar é normal se o documento não existe
        console.warn('⚠️  Não foi possível escutar preferências:', err.message);
        // Mesmo com erro, retornar preferências padrão
        callback({
          tema: 'dark',
          ordem_telas: [],
          notificacoes: true,
        });
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('❌ Erro crítico ao configurar escuta de preferências:', err.message);
    console.error('   Stack:', err.stack);
    // Retornar função dummy mesmo em caso de erro
    return () => {};
  }
}
