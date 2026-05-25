/**
 * features-validation.js - Valida se features de campus estão ativas antes de exibir
 */

import { db, doc, getDoc, onSnapshot } from './firebase-init.js';

/**
 * Cache local de campus para evitar chamadas repetidas
 */
const campusCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Busca dados do campus no Firestore e valida cache
 */
async function buscarCampus(campusId) {
  if (!campusId) return null;

  // Verificar cache
  if (campusCache.has(campusId)) {
    const cached = campusCache.get(campusId);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  try {
    const snap = await getDoc(doc(db, 'campus', campusId));
    if (snap.exists()) {
      const data = snap.data();
      campusCache.set(campusId, { data, timestamp: Date.now() });
      return data;
    }
  } catch (err) {
    console.warn('⚠️  Erro ao buscar campus:', err.message);
  }

  return null;
}

/**
 * Verifica se um campus está ativo
 */
export async function isCampusAtivo(campusId) {
  const campus = await buscarCampus(campusId);
  return campus ? campus.ativo === true : true; // Padrão: considerar ativo
}

/**
 * Verifica se uma feature está disponível em um campus
 */
export async function isFeatureAtiva(campusId, featureName) {
  const campus = await buscarCampus(campusId);
  if (!campus) return true; // Padrão: considerar ativo
  
  // Campus precisa estar ativo E ter a feature
  const ativoOk = campus.ativo === true;
  const featureOk = Array.isArray(campus.features) && campus.features.includes(featureName);
  
  return ativoOk && featureOk;
}

/**
 * Filtra horários de aulas removendo aqueles que estão em campus desativados
 * Usado no dashboard para filtrar turmas
 */
export async function filtrarHorariosPorCampus(turmas, campusDoUsuario) {
  if (!Array.isArray(turmas)) return turmas;

  // Se o usuário não tem campus definido, todos os horários são válidos
  if (!campusDoUsuario) return turmas;

  // Verificar se o campus do usuário está ativo
  const campusAtivo = await isCampusAtivo(campusDoUsuario);
  
  if (!campusAtivo) {
    // Campus desativado: filtrar turmas que têm horários
    console.warn(`⚠️  Campus ${campusDoUsuario} está DESATIVADO. Filtrando turmas...`);
    return turmas.map(t => ({
      ...t,
      horarios_de_aula: null, // Remover horários
      status: 'desativado',
    }));
  }

  // Campus ativo: retornar todas as turmas como estão
  return turmas;
}

/**
 * Escuta mudanças de campus em tempo real e aplica validações
 * Retorna função para desinscrever
 */
export function escutarStatusCampus(campusId, callback) {
  if (!campusId) {
    console.warn('⚠️  Campus ID inválido para escuta');
    return () => {};
  }

  try {
    // Limpar cache para forçar reload
    campusCache.delete(campusId);

    // Listener para mudanças no campus
    const unsubscribe = onSnapshot(
      doc(db, 'campus', campusId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          console.log(`✅ Campus ${campusId} status:`, { 
            ativo: data.ativo, 
            features: data.features 
          });
          // Atualizar cache
          campusCache.set(campusId, { data, timestamp: Date.now() });
          callback(data);
        }
      },
      (err) => {
        console.warn('⚠️  Erro ao escutar campus:', err.message);
        callback(null);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('❌ Erro ao configurar escuta de campus:', err.message);
    return () => {};
  }
}

/**
 * Limpa cache de campus
 */
export function limparCachesCampus() {
  campusCache.clear();
  console.log('✅ Cache de campus limpo');
}