const express = require('express');
const router = express.Router();
const axios = require('axios');
const querystring = require('querystring');
const admin = require('firebase-admin');
const firestore = require('../services/firestore');

const SUAP_BASE_URL = process.env.SUAP_BASE_URL;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// ===================================================
// Função: identificar campus_id pelo dado do SUAP
// ===================================================
function identificarCampus(dadosSuap) {
  const campusRaw =
    dadosSuap?.campus ||
    dadosSuap?.unidade_ensino ||
    dadosSuap?.campus_sigla ||
    '';

  let campusExtraido = campusRaw;
  if (!campusExtraido && dadosSuap?.curso) {
    const match = dadosSuap.curso.match(/\(CAMPUS ([^)]+)\)/i);
    if (match) {
      campusExtraido = match[1];
    }
  }

  console.log('📍 Campo campus recebido do SUAP:', campusRaw);
  console.log('📍 Campus extraído do curso:', campusExtraido);

  const mapeamento = {
    'santa cruz':    'santa-cruz',
    'zona norte':    'zona-norte',
    'natal central': 'natal-central',
    'mossoró':       'mossoro',
    'mossoro':       'mossoro',
    'apodi':         'apodi',
    'caicó':         'caico',
    'caico':         'caico',
    'ipanguaçu':     'ipanguacu',
    'ipanguacu':     'ipanguacu',
    'joão câmara':   'joao-camara',
    'joao camara':   'joao-camara',
    'macau':         'macau',
    'nova cruz':     'nova-cruz',
    'parelhas':      'parelhas',
    'pau dos ferros':'pau-dos-ferros',
  };

  const chave = campusExtraido
    .toLowerCase()
    .replace('campus ', '')
    .trim();

  const campus_id = mapeamento[chave];

  if (!campus_id) {
    console.warn(`⚠️  Campus não mapeado: "${campusExtraido}" (chave: "${chave}")`);
    console.warn('   Adicione este campus no mapeamento em backend/src/routes/auth.js');
  }

  return campus_id || 'desconhecido';
}

router.get('/login', (req, res) => {
  res.set('Cache-Control', 'no-store');

  const authURL = `${SUAP_BASE_URL}/o/authorize/?` + querystring.stringify({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
  });

  res.redirect(authURL);
});

// ===================================================
// ROTA: Callback do SUAP após autenticação
// ===================================================
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  const FRONTEND_URL = req.frontendURL;

  console.log('═════════════════════════════════════════');
  console.log('🔄 Callback OAuth recebido');
  console.log('═════════════════════════════════════════');
  console.log('🔗 Configuração:');
  console.log('   Hostname:', req.hostname);
  console.log('   Origin:', req.get('origin'));
  console.log('   FRONTEND_URL:', FRONTEND_URL);
  console.log('   SUAP_BASE_URL:', SUAP_BASE_URL);
  console.log('   CLIENT_ID:', CLIENT_ID ? '✅ Configurado' : '❌ NÃO configurado');
  console.log('   CLIENT_SECRET:', CLIENT_SECRET ? '✅ Configurado' : '❌ NÃO configurado');
  console.log('');
  console.log('📥 Parâmetros recebidos:');
  console.log('   code:', code ? `${code.substring(0, 30)}...` : '❌ NÃO RECEBIDO');
  console.log('   error:', error || '✅ Nenhum erro');
  console.log('');


  if (error) {
    console.log('❌ Erro OAuth do SUAP:', error);
    console.log('   Redirecionando para:', `${FRONTEND_URL}/callback.html?error=${error}`);
    return res.redirect(`${FRONTEND_URL}/callback.html?error=${error}`);
  }

  if (!code) {
    console.log('❌ Código de autorização não recebido');
    console.log('   Redirecionando para:', `${FRONTEND_URL}/callback.html?error=no_code`);
    return res.redirect(`${FRONTEND_URL}/callback.html?error=no_code`);
  }

  try {
    // 1. Trocar o code pelo access_token do SUAP
    console.log('\n🔄 ETAPA 1: Trocando code por token SUAP...');
    const tokenRes = await axios.post(
      `${SUAP_BASE_URL}/o/token/`,
      querystring.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const suapToken = tokenRes.data.access_token;
    const refreshToken = tokenRes.data.refresh_token;
    console.log('   ✅ Token SUAP recebido:', `${suapToken.substring(0, 30)}...`);
    
    const headers = { Authorization: `Bearer ${suapToken}`, Accept: 'application/json' };

    // 2. Buscar dados do aluno e dados pessoais no SUAP
    console.log('👤 Buscando dados do aluno no SUAP...');
    console.log('   URL:', `${SUAP_BASE_URL}/api/ensino/meus-dados-aluno/`);
    
    const [alunoRes, pessoalRes] = await Promise.allSettled([
      axios.get(`${SUAP_BASE_URL}/api/ensino/meus-dados-aluno/`, { headers, timeout: 10000 }),
      axios.get(`${SUAP_BASE_URL}/api/rh/eu/`, { headers, timeout: 10000 }),
    ]);

    console.log('📦 Resultados SUAP:');
    if (alunoRes.status === 'fulfilled') {
      console.log('   ✅ Dados do aluno - Status:', alunoRes.value.status);
      console.log('      Dados:', JSON.stringify(alunoRes.value.data, null, 2));
    } else {
      console.log('   ❌ Erro ao buscar dados do aluno:', alunoRes.reason?.message);
      console.log('      Código de erro:', alunoRes.reason?.code);
    }

    if (pessoalRes.status === 'fulfilled') {
      console.log('   ✅ Dados pessoais - Status:', pessoalRes.value.status);
      console.log('      Dados:', JSON.stringify(pessoalRes.value.data, null, 2));
    } else {
      console.log('   ❌ Erro ao buscar dados pessoais:', pessoalRes.reason?.message);
      console.log('      Código de erro:', pessoalRes.reason?.code);
    }

    const dadosAluno  = alunoRes.status  === 'fulfilled' ? alunoRes.value.data  : {};
    const dadosPessoal = pessoalRes.status === 'fulfilled' ? pessoalRes.value.data : {};

    console.log('📋 Dados do aluno (SUAP):', JSON.stringify(dadosAluno, null, 2));
    console.log('📋 Dados pessoais (SUAP):', JSON.stringify(dadosPessoal, null, 2));

    // ✅ CORRIGIDO: Matrícula vem em /api/rh/eu como "identificacao"
    const matricula = dadosPessoal?.identificacao || dadosAluno?.matricula || 'desconhecido';
    const nome = dadosPessoal?.nome_usual || dadosPessoal?.nome || dadosAluno?.nome_aluno || 'Usuário';
    const campus_id = identificarCampus(dadosAluno);

    console.log('\n📊 Dados consolidados:');
    console.log('   Aluno:', nome);
    console.log('   Matrícula:', matricula);
    console.log('   Campus:', campus_id);

    // 3. Criar UID estável para o Firebase
    const firebaseUID = `suap_${matricula}`;
    console.log('\n🔐 UID Firebase:', firebaseUID);

    // 4. Criar ou atualizar usuário no Firestore
    console.log('💾 Criando/atualizando usuário no Firestore...');
    const usuario = await firestore.criarOuAtualizarUsuario(firebaseUID, {
      nome,
      matricula,
      campus_id,
      suap_token: suapToken,
      refresh_token: refreshToken,
    });
    console.log('   ✅ Usuário criado/atualizado:', usuario);

    // 5. Criar Firebase Custom Token
    let customToken;
    console.log('\n🔑 Criando Firebase Custom Token...');
    try {
      customToken = await admin.auth().createCustomToken(firebaseUID, {
        campus_id,
        role: usuario.role || 'user',
      });
      console.log('   ✅ Token criado com sucesso');
      console.log('   UID:', firebaseUID);
      console.log('   Role:', usuario.role || 'user');
      console.log('   Campus:', campus_id);
    } catch (firebaseError) {
      console.error('   ❌ Erro ao criar token:', firebaseError.message);
      console.error('      Código:', firebaseError.code);
      throw firebaseError;
    }

    // 6. Redirecionar para o frontend com o Firebase token
    console.log('\n🚀 Redirecionando para frontend...');
    console.log('   URL:', `${FRONTEND_URL}/callback.html?firebase_token=***&suap_token=***`);
    res.redirect(`${FRONTEND_URL}/callback.html?firebase_token=${customToken}&suap_token=${encodeURIComponent(suapToken)}`);

  } catch (err) {
    console.error('\n❌ ERRO NO CALLBACK');
    console.error('   Mensagem:', err.message);
    console.error('   Código:', err.code);
    
    if (err.response) {
      console.error('   Status HTTP:', err.response.status);
      console.error('   Data:', err.response.data);
    }
    
    if (err.config) {
      console.error('   Request:');
      console.error('      Método:', err.config.method);
      console.error('      URL:', err.config.url);
    }
    
    console.error('   Stack:', err.stack);
    console.log('\n🔴 Redirecionando para login com erro...');
    res.redirect(`${FRONTEND_URL}/callback.html?error=auth_failed`);
  }

  console.log('═════════════════════════════════════════\n');
});


// ===================================================
// ROTA: Refresh Token SUAP
// ===================================================
router.post('/refresh', async (req, res) => {
  const { uid } = req.body;

  if (!uid) {
    return res.status(400).json({ erro: 'UID obrigatório' });
  }

  try {
    const usuario = await firestore.buscarUsuario(uid);

    if (!usuario?.refresh_token) {
      return res.status(401).json({ erro: 'Sem refresh token salvo. Faça login novamente.' });
    }

    const tokenRes = await axios.post(
      `${SUAP_BASE_URL}/o/token/`,
      querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: usuario.refresh_token,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const novoToken = tokenRes.data.access_token;
    const novoRefresh = tokenRes.data.refresh_token;

    console.log('🔄 Token renovado para:', uid);

    await firestore.criarOuAtualizarUsuario(uid, {
      nome: usuario.nome,
      matricula: usuario.matricula,
      campus_id: usuario.campus_id,
      suap_token: novoToken,
      refresh_token: novoRefresh,
    });

    res.json({ suap_token: novoToken });

  } catch (err) {
    console.error('❌ Erro ao renovar token:', err.message);
    res.status(401).json({ erro: 'Token expirado. Faça login novamente.' });
  }
});

// ===================================================
// ROTA: Logout
// ===================================================
router.get('/logout', (req, res) => {
  req.session?.destroy();
  res.json({ ok: true });
});

module.exports = router;