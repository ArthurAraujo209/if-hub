const admin = require('firebase-admin');

function db() {
  return admin.firestore();
}

module.exports = {

  // ===== CAMPUS =====

  async buscarCampus(campus_id) {
    const snap = await db().collection('campus').doc(campus_id).get();
    return snap.exists ? snap.data() : null;
  },

  async buscarTodosCampi() {
    const snap = await db().collection('campus').get();
    return snap.docs.map(d => d.data());
  },

  async atualizarCampus(campus_id, dados) {
    console.log(`🔄 Atualizando campus ${campus_id} com dados:`, dados);
    await db().collection('campus').doc(campus_id).update(dados);
    console.log(`✅ Campus ${campus_id} atualizado com sucesso`);
  },

  // ===== USUÁRIOS =====

  async buscarUsuario(uid) {
    const snap = await db().collection('usuarios').doc(uid).get();
    return snap.exists ? snap.data() : null;
  },

  async criarOuAtualizarUsuario(uid, dados) {
    console.log('\n💾 CRIANDO/ATUALIZANDO USUÁRIO NO FIRESTORE');
    console.log('   UID:', uid);
    console.log('   Dados a serem salvos:', dados);
    
    const ref = db().collection('usuarios').doc(uid);
    const snap = await ref.get();

    if (!snap.exists) {
      console.log('   📝 Primeiro login - criando documento novo...');
      
      const novoUsuario = {
        uid,
        nome: dados.nome || 'Usuário',
        matricula: dados.matricula || null,
        email_academico: dados.email_academico || null,
        foto_url: dados.foto_url || null,
        cpf: dados.cpf || null,
        data_nascimento: dados.data_nascimento || null,
        campus_id: dados.campus_id || null,
        role: 'user',
        campus_admin: null,
        suap_token: dados.suap_token || null,
        refresh_token: dados.refresh_token || null,
        criado_em: admin.firestore.FieldValue.serverTimestamp(),
        ultimo_login: admin.firestore.FieldValue.serverTimestamp(),
        preferencias: {
          tema: 'dark',
          ordem_telas: [],
          notificacoes: true,
        },
      };
      
      console.log('   📥 Enviando para Firestore...');
      await ref.set(novoUsuario);
      console.log('   ✅ Documento criado com sucesso');
      
    } else {
      console.log('   🔄 Login subsequente - atualizando documento existente...');
      
      const atualizacao = {
        nome: dados.nome || 'Usuário',
        matricula: dados.matricula || null,
        email_academico: dados.email_academico || null,
        foto_url: dados.foto_url || null,
        cpf: dados.cpf || null,
        data_nascimento: dados.data_nascimento || null,
        campus_id: dados.campus_id || null,
        suap_token: dados.suap_token || null,
        refresh_token: dados.refresh_token || null,
        ultimo_login: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      console.log('   📥 Enviando atualização para Firestore...');
      await ref.update(atualizacao);
      console.log('   ✅ Documento atualizado com sucesso');
    }

    console.log('   📖 Lendo documento atualizado do Firestore...');
    const atualizado = await ref.get();
    console.log('   ✅ Dados salvos:', atualizado.data());
    
    return atualizado.data();
  },

  async buscarTodosUsuarios() {
    const snap = await db().collection('usuarios').get();
    return snap.docs.map(d => d.data());
  },

  async atualizarRoleUsuario(uid, role, campus_admin = null) {
    const update = { role };
    if (campus_admin) update.campus_admin = campus_admin;
    await db().collection('usuarios').doc(uid).update(update);
  },

  // ===== MAPAS =====

  async buscarMapa(campus_id) {
    const snap = await db().collection('mapas').doc(campus_id).get();
    return snap.exists ? snap.data() : { campus_id, salas: [] };
  },

  async salvarMapa(campus_id, salas, admin_uid, imagem_url = null) {
    await db().collection('mapas').doc(campus_id).set({
      campus_id,
      salas,
      imagem_url,
      atualizado_em: admin.firestore.FieldValue.serverTimestamp(),
      atualizado_por: admin_uid,
    });
  },
};