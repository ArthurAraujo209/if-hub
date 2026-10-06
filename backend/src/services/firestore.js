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

    const ref = db().collection('usuarios').doc(uid);
    const snap = await ref.get();
    const isNewUser = !snap.exists;

    // Campos que TODO login atualiza
    const commonPayload = {
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
      plataforma_ultima: 'web',
      total_acessos: admin.firestore.FieldValue.increment(1),
      ultimo_acesso: admin.firestore.FieldValue.serverTimestamp(),
    };

    const academicPayload = {};
    if (typeof dados.curso === 'string' && dados.curso.trim()) {
      academicPayload.curso = dados.curso.trim();
    }
    for (const campo of ['ano_ingresso', 'ano_atual']) {
      if (Number.isInteger(dados[campo]) && dados[campo] > 0) {
        academicPayload[campo] = dados[campo];
      }
    }

    // Campos que só na primeira vez
    const firstLoginPayload = isNewUser
      ? {
          role: 'user',
          campus_admin: null,
          criado_em: admin.firestore.FieldValue.serverTimestamp(),
          plataforma_origem: 'web',
          preferencias: {
            tema: 'dark',
            ordem_telas: [],
            notificacoes: true,
          },
        }
      : {};

    if (isNewUser) {
      console.log('   📝 Primeiro login — criando documento novo');
    } else {
      console.log('   🔄 Login subsequente — atualizando');
    }

    await ref.set({ ...commonPayload, ...academicPayload, ...firstLoginPayload }, { merge: true });
    console.log('   ✅ Documento salvo com sucesso');

    const atualizado = await ref.get();
    return atualizado.data();
  },

  async sincronizarUsuarioWeb(uid, dados) {
    const ref = db().collection('usuarios').doc(uid);
    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
    const profile = {
      nome: dados.nome || 'Usuário',
      matricula: dados.matricula,
      email_academico: dados.email_academico || null,
      foto_url: dados.foto_url || null,
      cpf: dados.cpf || null,
      data_nascimento: dados.data_nascimento || null,
      campus_id: dados.campus_id || 'desconhecido',
      suap_token: dados.suap_token,
    };

    if (typeof dados.curso === 'string' && dados.curso.trim()) {
      profile.curso = dados.curso.trim();
    }
    for (const campo of ['ano_ingresso', 'ano_atual']) {
      if (Number.isInteger(dados[campo]) && dados[campo] > 0) {
        profile[campo] = dados[campo];
      }
    }

    await db().runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists) {
        transaction.set(ref, {
          ...profile,
          role: 'user',
          campus_admin: null,
          refresh_token: null,
          criado_em: serverTimestamp,
          ultimo_login: serverTimestamp,
          ultimo_acesso: serverTimestamp,
          plataforma_origem: 'web',
          plataforma_ultima: 'web',
          total_acessos: 1,
          preferencias: {
            tema: 'dark',
            ordem_telas: [],
            notificacoes: true,
          },
        });
        return;
      }

      const existing = snap.data();
      const update = { plataforma_ultima: 'web', suap_token: dados.suap_token };
      for (const [campo, valor] of Object.entries(profile)) {
        if (valor !== null && valor !== undefined) {
          update[campo] = valor;
        }
      }

      const ultimoAcesso = existing.ultimo_acesso?.toDate?.()?.getTime?.() || 0;
      if (Date.now() - ultimoAcesso > 30 * 60 * 1000) {
        update.ultimo_acesso = serverTimestamp;
        update.total_acessos = admin.firestore.FieldValue.increment(1);
      }

      transaction.set(ref, update, { merge: true });
    });
  },

  async buscarTodosUsuarios() {
    const snap = await db().collection('usuarios').get();
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
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