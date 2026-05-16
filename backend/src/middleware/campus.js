// campus.js — Carrega configurações do campus e ativa/desativa features dinamicamente
import { db, doc, getDoc } from './firebase-init.js';

// ============================================================
// Registro de todas as features do sistema
// Cada feature precisa ter um elemento com o id correspondente no HTML
// Exemplo: feature "mapa" controla o elemento com id="tab-mapa"
// ============================================================
const FEATURES = {
  dashboard: {
    label:      'Início',
    tabId:      'tab-dashboard',
    secaoId:    'secao-dashboard',
  },
  horarios: {
    label:      'Horários',
    tabId:      'tab-horarios',
    secaoId:    'secao-horarios',
  },
  notas: {
    label:      'Notas',
    tabId:      'tab-notas',
    secaoId:    'secao-notas',
  },
  avaliacoes: {
    label:      'Avaliações',
    tabId:      'tab-avaliacoes',
    secaoId:    'secao-avaliacoes',
  },
  mapa: {
    label:      'Mapa',
    tabId:      'tab-mapa',
    secaoId:    'secao-mapa',
  },
};

// ============================================================
// Função principal: carrega campus e aplica features
// ============================================================
export async function carregarCampus(campus_id) {
  console.log(`🏫 Carregando campus: ${campus_id}`);

  try {
    const campusDoc = await getDoc(doc(db, 'campus', campus_id));

    if (!campusDoc.exists()) {
      console.error(`❌ Campus "${campus_id}" não encontrado no Firestore.`);
      console.error('   Crie o documento em: Firestore → campus → ' + campus_id);
      mostrarErroCampus(campus_id);
      return null;
    }

    const campus = campusDoc.data();
    console.log(`✅ Campus carregado: ${campus.nome}`, campus);

    // 1. Esconder TODAS as features primeiro
    Object.values(FEATURES).forEach(({ tabId, secaoId }) => {
      const tab   = document.getElementById(tabId);
      const secao = document.getElementById(secaoId);
      if (tab)   tab.style.display   = 'none';
      if (secao) secao.style.display = 'none';
    });

    // 2. Mostrar apenas as features liberadas para este campus
    const featuresLiberadas = campus.features || [];
    console.log(`🎛️  Features liberadas para ${campus.nome}:`, featuresLiberadas);

    featuresLiberadas.forEach(featureId => {
      const feature = FEATURES[featureId];
      if (!feature) {
        console.warn(`⚠️  Feature desconhecida: "${featureId}" — adicione-a em campus.js`);
        return;
      }

      const tab   = document.getElementById(feature.tabId);
      const secao = document.getElementById(feature.secaoId);
      if (tab)   tab.style.display   = '';
      if (secao) secao.style.display = '';
    });

    // 3. Aplicar cor do campus (se configurada)
    if (campus.config?.cor_primaria) {
      document.documentElement.style.setProperty('--accent', campus.config.cor_primaria);
      document.documentElement.style.setProperty('--ios-accent-green', campus.config.cor_primaria);
    }

    // 4. Mostrar nome do campus na interface (se existir o elemento)
    const nomeCampusEl = document.getElementById('nome-campus');
    if (nomeCampusEl) nomeCampusEl.textContent = campus.nome;

    return campus;

  } catch (err) {
    console.error('❌ Erro ao carregar campus:', err);
    return null;
  }
}

// ============================================================
// Verificar se campus tem uma feature específica
// ============================================================
export async function campusPossuiFeature(campus_id, feature_id) {
  try {
    const campusDoc = await getDoc(doc(db, 'campus', campus_id));
    if (!campusDoc.exists()) return false;
    return campusDoc.data().features?.includes(feature_id) ?? false;
  } catch {
    return false;
  }
}

// ============================================================
// Carregar mapa do campus (Firestore com fallback local)
// ============================================================
export async function carregarMapaCampus(campus_id) {
  try {
    const mapaDoc = await getDoc(doc(db, 'mapas', campus_id));

    if (mapaDoc.exists()) {
      console.log('🗺️  Mapa carregado do Firestore');
      return mapaDoc.data().salas || [];
    }

    // Fallback: arquivo local (Santa Cruz)
    if (campus_id === 'santa-cruz') {
      console.log('🗺️  Mapa carregado do arquivo local (fallback)');
      const res = await fetch('./assets/data/salas.json');
      const dados = await res.json();
      return dados.salas || [];
    }

    console.warn(`⚠️  Nenhum mapa encontrado para o campus "${campus_id}"`);
    return [];

  } catch (err) {
    console.error('❌ Erro ao carregar mapa:', err);
    return [];
  }
}

// ============================================================
// Helpers internos
// ============================================================
function mostrarErroCampus(campus_id) {
  const aviso = document.createElement('div');
  aviso.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: #f5576c; color: white; padding: 12px 24px;
    border-radius: 8px; z-index: 9999; font-size: 14px;
  `;
  aviso.textContent = `Campus "${campus_id}" não configurado. Contate o administrador.`;
  document.body.appendChild(aviso);
  setTimeout(() => aviso.remove(), 6000);
}