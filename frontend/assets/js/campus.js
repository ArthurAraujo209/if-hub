import { db, doc, getDoc } from './firebase-init.js';

export async function carregarCampus(campusId) {
  if (!campusId || campusId === 'desconhecido') {
    console.warn('⚠️  Campus ID inválido:', campusId);
    return null;
  }

  try {
    console.log('📍 Buscando campus:', campusId);
    const snap = await getDoc(doc(db, 'campus', campusId));
    
    if (snap.exists()) {
      console.log('✅ Campus carregado:', snap.data());
      return snap.data();
    } else {
      console.warn(`⚠️  Campus "${campusId}" não encontrado no Firestore`);
      console.warn('   Isso é normal se o campus ainda não foi configurado');
      return null;
    }
  } catch (err) {
    console.error('❌ Erro ao carregar campus:', err.message);
    console.error('   Código:', err.code);
    // Não repassar o erro, deixar falhar gracefully
    return null;
  }
}
