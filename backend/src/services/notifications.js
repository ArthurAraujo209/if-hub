const axios = require('axios');
const cron = require('node-cron');
const admin = require('./firebase');

// Armazena: token -> {fcmToken, lastCheck, lastNotas, lastAvaliacoes}
const subscriptions = new Map();

async function enviarFCM(fcmToken, data) {
  const baseURL = process.env.FRONTEND_URL || 'https://simplifrn.vercel.app';

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: data.title,
        body: data.body,
      },
      webpush: {
        fcmOptions: {
          link: baseURL + data.url,
        },
        notification: {
          icon: `${baseURL}/assets/icons/IF HUB - SEM FUNDO - 192x192.png`,
          badge: `${baseURL}/assets/icons/badge-72x72.png`,
        },
      },
    });
    console.log('✅ FCM enviado');
    return true;
  } catch (err) {
    console.error('❌ Erro FCM:', err.code, err.message);
    return false;
  }
}

async function verificarNovidades(token, userData) {
  const { SUAP_BASE_URL } = process.env;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
  const anoAtual = new Date().getFullYear();
  let notificacoes = 0;

  console.log(`\n🔍 [${new Date().toLocaleTimeString()}] Usuário: ${token.substring(0, 20)}...`);

  try {
    const boletimRes = await axios.get(
      `${SUAP_BASE_URL}/api/ensino/meu-boletim/${anoAtual}/1/`,
      { headers, timeout: 10000 }
    );

    const disciplinas = boletimRes.data?.results || [];
    console.log(`  📊 ${disciplinas.length} disciplinas`);

    for (const disc of disciplinas) {
      for (let etapa = 1; etapa <= 4; etapa++) {
        const notaKey = `${disc.codigo_diario}_etapa${etapa}`;
        const notaAtual = disc[`nota_etapa_${etapa}`]?.nota;
        const notaAnterior = userData.lastNotas.get(notaKey);

        if (notaAtual !== null && notaAtual !== undefined && notaAnterior === undefined) {
          console.log(`    🔔 NOTA NOVA: ${disc.disciplina} - ${etapa}ª: ${notaAtual}`);
          userData.lastNotas.set(notaKey, notaAtual);
          await enviarFCM(userData.fcmToken, {
            title: '📊 Nota Publicada!',
            body: `${disc.disciplina.split(' - ')[1] || disc.disciplina}: ${notaAtual} (${etapa}ª etapa)`,
            url: '/dashboard.html#boletim',
          });
          notificacoes++;
        }
      }
    }
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('  ⚠️ Token expirado');
    } else {
      console.error('  ❌ Erro boletim:', err.message);
    }
  }

  try {
    const avalRes = await axios.get(
      `${SUAP_BASE_URL}/api/ensino/minhas-proximas-avaliacoes/`,
      { headers, timeout: 10000 }
    );

    const avaliacoes = avalRes.data?.results || [];
    console.log(`  📝 ${avaliacoes.length} avaliações`);

    for (const av of avaliacoes) {
      const avId = av.id.toString();
      if (!userData.lastAvaliacoes.has(avId)) {
        console.log(`    🔔 AVALIAÇÃO NOVA: ${av.descricao || 'Prova'}`);
        userData.lastAvaliacoes.add(avId);
        const dias = Math.ceil((new Date(av.data) - new Date()) / (1000 * 60 * 60 * 24));
        await enviarFCM(userData.fcmToken, {
          title: '📝 Nova Avaliação Agendada!',
          body: `${av.descricao || 'Prova'} em ${dias} dias`,
          url: '/dashboard.html#avaliacoes',
        });
        notificacoes++;
      }
    }
  } catch (err) {
    console.error('  ❌ Erro avaliações:', err.message);
  }

  userData.lastCheck = new Date();
  console.log(`  ✅ ${notificacoes} notificação(ões)\n`);
}

function iniciarCron() {
  cron.schedule('*/30 * * * *', async () => {
    console.log('🔍 Verificando novidades...', new Date().toISOString());

    if (subscriptions.size === 0) {
      console.log('Nenhum usuário inscrito');
      return;
    }

    for (const [token, userData] of subscriptions) {
      try {
        await verificarNovidades(token, userData);
      } catch (err) {
        console.error(`Erro ${token.substring(0, 20)}:`, err.message);
      }
    }
  });
}

module.exports = { subscriptions, enviarFCM, iniciarCron };