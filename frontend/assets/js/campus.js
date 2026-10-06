// assets/js/campus.js
// Carrega dados do campus e aplica features dinamicamente.
import { db, doc, getDoc } from './firebase-init.js';

// Registro de features. Cada chave precisa de tab-<id> e secao-<id> no HTML.
const FEATURES = {
  dashboard:  { tabId: 'tab-dashboard',  secaoId: 'secao-dashboard'  },
  horarios:   { tabId: 'tab-horarios',   secaoId: 'secao-horarios'   },
  notas:      { tabId: 'tab-notas',      secaoId: 'secao-notas'      },
  avaliacoes: { tabId: 'tab-avaliacoes', secaoId: 'secao-avaliacoes' },
  mapa:       { tabId: 'tab-mapa',       secaoId: 'secao-mapa'       },
};

export async function carregarCampus(campusId) {
  if (!campusId || campusId === 'desconhecido') return null;

  try {
    const snap = await getDoc(doc(db, 'campus', campusId));
    if (!snap.exists()) {
      console.warn(`⚠️ Campus "${campusId}" não configurado no Firestore`);
      return null;
    }

    const campus = snap.data();
    aplicarFeatures(campus);
    return campus;
  } catch (err) {
    console.warn('⚠️ Erro ao carregar campus:', err.message);
    return null;
  }
}

function aplicarFeatures(campus) {
  // ✅ FIX: se `features` não estiver definido, libera TODAS.
  // Antes, um campus recém-criado (sem `features`) ficava com o dashboard vazio.
  const liberadas = Array.isArray(campus.features)
    ? campus.features
    : Object.keys(FEATURES);

  Object.entries(FEATURES).forEach(([id, { tabId, secaoId }]) => {
    const visivel = liberadas.includes(id) ? '' : 'none';
    const tab   = document.getElementById(tabId);
    const secao = document.getElementById(secaoId);
    if (tab)   tab.style.display   = visivel;
    if (secao) secao.style.display = visivel;
  });

  if (campus.config?.cor_primaria) {
    document.documentElement.style.setProperty('--accent', campus.config.cor_primaria);
    document.documentElement.style.setProperty('--ios-accent-green', campus.config.cor_primaria);
  }

  const nomeEl = document.getElementById('nome-campus');
  if (nomeEl) nomeEl.textContent = campus.nome;
}

export async function campusPossuiFeature(campusId, featureId) {
  try {
    const snap = await getDoc(doc(db, 'campus', campusId));
    if (!snap.exists()) return false;
    const features = snap.data().features;
    if (!Array.isArray(features)) return true; // fallback = tudo liberado
    return features.includes(featureId);
  } catch {
    return false;
  }
}

// Mapa do campus — Firestore com fallback local (Santa Cruz).
export async function carregarMapaCampus(campusId) {
  try {
    const mapaDoc = await getDoc(doc(db, 'mapas', campusId));
    if (mapaDoc.exists()) return mapaDoc.data().salas || [];

    if (campusId === 'santa-cruz') {
      const res = await fetch('./assets/data/salas.json');
      const dados = await res.json();
      return dados.salas || [];
    }
    return [];
  } catch (err) {
    console.warn('⚠️ Erro ao carregar mapa:', err.message);
    return [];
  }
}