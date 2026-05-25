/**
 * admin-users.js - Gerenciamento de usuários no painel admin
 * Busca, filtra, exibe fotos e dados detalhados
 */

import { db, collection, getDocs, query, where } from './firebase-init.js';

/**
 * Cache de usuários para evitar chamadas repetidas
 */
let usuariosCache = [];
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos
let lastCacheTime = 0;

/**
 * Carrega todos os usuários do Firestore
 */
export async function carregarUsuarios(forcarReload = false) {
  try {
    // Verificar cache
    if (usuariosCache.length > 0 && !forcarReload && Date.now() - lastCacheTime < CACHE_TTL) {
      console.log('✅ Usando cache de usuários');
      return usuariosCache;
    }

    console.log('📥 Buscando usuários do Firestore...');
    
    const snap = await getDocs(collection(db, 'usuarios'));
    usuariosCache = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      usuariosCache.push({
        uid: docSnap.id,
        nome: data.nome || 'Desconhecido',
        email: data.email || 'N/A',
        email_academico: data.email_academico || null,
        matricula: data.matricula || null,
        foto_url: data.foto_url || null,
        campus_preferido: data.campus_preferido || null,
        created_at: data.created_at ? new Date(data.created_at) : null,
        last_login: data.last_login ? new Date(data.last_login) : null,
        updated_at: data.updated_at ? new Date(data.updated_at) : null,
      });
    });

    lastCacheTime = Date.now();
    console.log(`✅ ${usuariosCache.length} usuários carregados`);
    return usuariosCache;

  } catch (err) {
    console.error('❌ Erro ao carregar usuários:', err.message);
    return [];
  }
}

/**
 * Busca usuários por nome, email ou matrícula
 */
export function buscaUsuarios(termo, usuarios = usuariosCache) {
  if (!termo || termo.trim().length < 1) return usuarios;

  const termo_lower = termo.toLowerCase();
  
  return usuarios.filter(u => 
    u.nome.toLowerCase().includes(termo_lower) ||
    u.email.toLowerCase().includes(termo_lower) ||
    u.email_academico?.toLowerCase().includes(termo_lower) ||
    u.matricula?.includes(termo) ||
    u.uid.includes(termo)
  );
}

/**
 * Filtra usuários por campus
 */
export function filtrarPorCampus(campus, usuarios = usuariosCache) {
  if (!campus || campus === '') return usuarios;
  return usuarios.filter(u => u.campus_preferido === campus);
}

/**
 * Formata data para exibição
 */
function formatarData(date) {
  if (!date) return 'N/A';
  if (typeof date === 'string') date = new Date(date);
  return date.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Gera HTML para foto do usuário
 */
function renderizarFoto(usuario) {
  if (usuario.foto_url) {
    return `<img src="${usuario.foto_url}" alt="${usuario.nome}" title="Foto do usuário" style="border-radius: 50%; object-fit: cover;">`;
  } else {
    const iniciais = usuario.nome
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
    return `<span style="font-weight: 600;">${iniciais}</span>`;
  }
}

/**
 * Renderiza tabela de usuários no admin
 */
export function renderizarTabela(usuarios) {
  if (usuarios.length === 0) {
    return `
      <div style="padding: 40px 20px; text-align: center; color: var(--text2);">
        <i class="fas fa-users" style="font-size: 3rem; opacity: 0.3; margin-bottom: 20px;"></i>
        <p>Nenhum usuário encontrado</p>
      </div>
    `;
  }

  let html = `
    <table class="tabela">
      <thead>
        <tr>
          <th style="width: 50px;"></th>
          <th>Nome</th>
          <th>Email Acadêmico</th>
          <th>Matrícula</th>
          <th>Campus</th>
          <th>Último Acesso</th>
          <th style="width: 100px;">Ações</th>
        </tr>
      </thead>
      <tbody>
  `;

  usuarios.forEach(usuario => {
    const fotoHtml = renderizarFoto(usuario);
    const ultimoAcesso = formatarData(usuario.last_login);
    
    html += `
      <tr>
        <td>
          <div class="user-avatar">
            ${fotoHtml}
          </div>
        </td>
        <td>
          <strong>${escapeHtml(usuario.nome)}</strong>
          <br>
          <small style="color: var(--text2);">${usuario.uid.substring(0, 12)}...</small>
        </td>
        <td>${escapeHtml(usuario.email_academico || 'N/A')}</td>
        <td>${escapeHtml(usuario.matricula || 'N/A')}</td>
        <td>
          ${usuario.campus_preferido 
            ? `<span class="tag" style="background: rgba(0,212,255,0.1);">${escapeHtml(usuario.campus_preferido)}</span>`
            : '<span style="color: var(--text2); font-size: 12px;">Não definido</span>'
          }
        </td>
        <td style="font-size: 12px; color: var(--text2);">
          ${ultimoAcesso}
        </td>
        <td>
          <button class="btn btn-ghost" style="padding: 4px 8px; font-size: 12px;" onclick="verDetalhesUsuario('${usuario.uid}')">
            <i class="fa fa-eye"></i> Ver
          </button>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
}

/**
 * Renderiza modal com detalhes do usuário
 */
export function renderizarDetalhesUsuario(usuario) {
  const fotoHtml = renderizarFoto(usuario);

  return `
    <div style="background: var(--bg); border-radius: 12px; padding: 24px; max-width: 600px; margin: 0 auto;">
      
      <!-- Cabeçalho com foto -->
      <div style="display: flex; gap: 20px; margin-bottom: 24px; align-items: flex-start;">
        <div class="user-avatar" style="width: 80px; height: 80px; font-size: 28px;">
          ${fotoHtml}
        </div>
        <div style="flex: 1;">
          <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 4px;">${escapeHtml(usuario.nome)}</h3>
          <p style="color: var(--text2); font-size: 13px; margin-bottom: 12px;">${escapeHtml(usuario.email)}</p>
          ${usuario.role ? `<span class="badge badge-${usuario.role === 'admin' ? 'ativo' : 'inativo'}" style="font-size: 11px;">${usuario.role.toUpperCase()}</span>` : ''}
        </div>
      </div>

      <!-- Informações detalhadas -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
        
        <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
          <label style="color: var(--text2); font-size: 11px; text-transform: uppercase;">Email Acadêmico</label>
          <p style="font-weight: 500; margin-top: 4px;">${escapeHtml(usuario.email_academico || 'N/A')}</p>
        </div>

        <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
          <label style="color: var(--text2); font-size: 11px; text-transform: uppercase;">Matrícula</label>
          <p style="font-weight: 500; margin-top: 4px;">${escapeHtml(usuario.matricula || 'N/A')}</p>
        </div>

        <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
          <label style="color: var(--text2); font-size: 11px; text-transform: uppercase;">Campus Preferido</label>
          <p style="font-weight: 500; margin-top: 4px;">${escapeHtml(usuario.campus_preferido || 'Não definido')}</p>
        </div>

        <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
          <label style="color: var(--text2); font-size: 11px; text-transform: uppercase;">UID</label>
          <p style="font-weight: 500; margin-top: 4px; font-size: 11px; font-family: monospace; word-break: break-all;">
            ${usuario.uid}
          </p>
        </div>

      </div>

      <!-- Timestamps -->
      <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; font-size: 12px;">
        <p style="color: var(--text2); margin-bottom: 8px;">
          <strong>Criado em:</strong> ${formatarData(usuario.created_at)}
        </p>
        <p style="color: var(--text2); margin-bottom: 0;">
          <strong>Último acesso:</strong> ${formatarData(usuario.last_login)}
        </p>
      </div>

    </div>
  `;
}

/**
 * Escapa HTML para evitar XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Obter lista de campus únicos
 */
export function obterCampusUnicos(usuarios = usuariosCache) {
  const campi = new Set();
  usuarios.forEach(u => {
    if (u.campus_preferido) campi.add(u.campus_preferido);
  });
  return Array.from(campi).sort();
}
