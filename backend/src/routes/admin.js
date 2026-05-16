const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const verificarAdmin = require('../middleware/admin');
const firestore = require('../services/firestore');

// Aplicar verificação de admin em TODAS as rotas deste arquivo
router.use(verificarAdmin);

// ===================================================
// CAMPUS
// ===================================================

// Listar todos os campi
router.get('/campus', async (req, res) => {
  try {
    const campi = await firestore.buscarTodosCampi();
    res.json(campi);
  } catch (err) {
    console.error('Erro ao listar campi:', err);
    res.status(500).json({ erro: 'Erro ao buscar campi' });
  }
});

// Atualizar features de um campus
router.put('/campus/:id/features', async (req, res) => {
  try {
    const { id } = req.params;
    const { features } = req.body;

    if (!Array.isArray(features)) {
      return res.status(400).json({ erro: 'features deve ser um array' });
    }

    // Admin de campus só pode editar o próprio campus
    if (req.adminUser.role === 'admin_campus' && req.adminUser.campus_admin !== id) {
      return res.status(403).json({ erro: 'Sem permissão para editar este campus' });
    }

    await firestore.atualizarCampus(id, { features });
    res.json({ ok: true, mensagem: 'Features atualizadas com sucesso' });

  } catch (err) {
    console.error('Erro ao atualizar features:', err);
    res.status(500).json({ erro: 'Erro ao atualizar features' });
  }
});

// Ativar ou desativar campus (apenas superadmin)
router.put('/campus/:id/status', async (req, res) => {
  try {
    if (req.adminUser.role !== 'admin') {
      return res.status(403).json({ erro: 'Apenas superadmins podem alterar status do campus' });
    }

    const { ativo } = req.body;

    if (typeof ativo !== 'boolean') {
      return res.status(400).json({ erro: 'ativo deve ser true ou false' });
    }

    await firestore.atualizarCampus(req.params.id, { ativo });
    res.json({ ok: true, mensagem: `Campus ${ativo ? 'ativado' : 'desativado'} com sucesso` });

  } catch (err) {
    console.error('Erro ao alterar status:', err);
    res.status(500).json({ erro: 'Erro ao alterar status do campus' });
  }
});

// Criar campus novo (apenas superadmin)
router.post('/campus', async (req, res) => {
  try {
    if (req.adminUser.role !== 'admin') {
      return res.status(403).json({ erro: 'Apenas superadmins podem criar campus' });
    }

    const { id, nome, sigla, features, config } = req.body;

    if (!id || !nome) {
      return res.status(400).json({ erro: 'id e nome são obrigatórios' });
    }

    const db = admin.firestore();
    await db.collection('campus').doc(id).set({
      id,
      nome,
      sigla: sigla || '',
      ativo: true,
      features: features || [],
      config: config || {},
    });

    res.json({ ok: true, mensagem: 'Campus criado com sucesso' });

  } catch (err) {
    console.error('Erro ao criar campus:', err);
    res.status(500).json({ erro: 'Erro ao criar campus' });
  }
});

// ===================================================
// USUÁRIOS
// ===================================================

// Listar todos os usuários (apenas superadmin)
router.get('/usuarios', async (req, res) => {
  try {
    if (req.adminUser.role !== 'admin') {
      return res.status(403).json({ erro: 'Apenas superadmins podem listar usuários' });
    }

    const usuarios = await firestore.buscarTodosUsuarios();
    res.json(usuarios);

  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ erro: 'Erro ao buscar usuários' });
  }
});

// Alterar role de usuário (apenas superadmin)
router.put('/usuarios/:uid/role', async (req, res) => {
  try {
    if (req.adminUser.role !== 'admin') {
      return res.status(403).json({ erro: 'Apenas superadmins podem alterar roles' });
    }

    const { role, campus_admin } = req.body;

    const rolesValidas = ['user', 'admin', 'admin_campus'];
    if (!rolesValidas.includes(role)) {
      return res.status(400).json({ erro: `Role inválida. Use: ${rolesValidas.join(', ')}` });
    }

    await firestore.atualizarRoleUsuario(req.params.uid, role, campus_admin);
    res.json({ ok: true, mensagem: 'Role atualizada com sucesso' });

  } catch (err) {
    console.error('Erro ao alterar role:', err);
    res.status(500).json({ erro: 'Erro ao alterar role' });
  }
});

// ===================================================
// MAPAS
// ===================================================

// Buscar mapa de um campus
router.get('/mapas/:campus_id', async (req, res) => {
  try {
    const mapa = await firestore.buscarMapa(req.params.campus_id);
    res.json(mapa);
  } catch (err) {
    console.error('Erro ao buscar mapa:', err);
    res.status(500).json({ erro: 'Erro ao buscar mapa' });
  }
});

// Salvar/atualizar mapa de um campus
router.put('/mapas/:campus_id', async (req, res) => {
  try {
    const { campus_id } = req.params;
    const { salas, imagem_url } = req.body;

    if (!Array.isArray(salas)) {
      return res.status(400).json({ erro: 'salas deve ser um array JSON' });
    }

    // Admin de campus só pode editar o próprio campus
    if (req.adminUser.role === 'admin_campus' && req.adminUser.campus_admin !== campus_id) {
      return res.status(403).json({ erro: 'Sem permissão para editar o mapa deste campus' });
    }

    await firestore.salvarMapa(campus_id, salas, req.adminUser.uid, imagem_url);
    res.json({ ok: true, mensagem: 'Mapa salvo com sucesso' });

  } catch (err) {
    console.error('Erro ao salvar mapa:', err);
    res.status(500).json({ erro: 'Erro ao salvar mapa' });
  }
});

module.exports = router;