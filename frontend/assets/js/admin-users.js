// assets/js/admin-users.js
// Gerenciamento de usuários no painel admin.
import { db, collection, getDocs } from './firebase-init.js';

let usuariosCache = [];
const CACHE_TTL = 2 * 60 * 1000;
let lastCacheTime = 0;

function parseTimestamp(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (typeof ts === 'string') return new Date(ts);
  if (ts instanceof Date) return ts;
  return null;
}

export async function carregarUsuarios(forcarReload = false) {
  try {
    if (usuariosCache.length > 0 && !forcarReload && Date.now() - lastCacheTime < CACHE_TTL) {
      return usuariosCache;
    }

    const snap = await getDocs(collection(db, 'usuarios'));
    usuariosCache = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      usuariosCache.push({
        uid: docSnap.id,
        nome: data.nome || 'Desconhecido',
        // ✅ FIX: backend só grava `email_academico` — não existe `email`.
        email_academico: data.email_academico || null,
        matricula: data.matricula || null,
        foto_url: data.foto_url || null,
        campus_id: data.campus_id || null,
        role: data.role || 'user',
        criado_em: parseTimestamp(data.criado_em),
        ultimo_login: parseTimestamp(data.ultimo_login),
      });
    });

    lastCacheTime = Date.now();
    return usuariosCache;
  } catch (err) {
    console.error('❌ Erro ao carregar usuários:', err.message);
    return [];
  }
}

export function buscaUsuarios(termo, usuarios = usuariosCache) {
  if (!termo || termo.trim().length < 1) return usuarios;
  const t = termo.toLowerCase();
  return usuarios.filter(u =>
    u.nome.toLowerCase().includes(t) ||
    u.email_academico?.toLowerCase().includes(t) ||
    u.matricula?.includes(termo) ||
    u.uid.includes(termo)
  );
}

export function filtrarPorCampus(campus, usuarios = usuariosCache) {
  if (!campus) return usuarios;
  return usuarios.filter(u => u.campus_id === campus);
}

function formatarData(date) {
  if (!date) return 'N/A';
  if (typeof date === 'string') date = new Date(date);
  return date.toLocaleDateString('pt-BR', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function renderizarFoto(usuario) {
  if (usuario.foto_url) {
    return `<img src="${usuario.foto_url}" alt="${usuario.nome}" title="Foto do usuário" style="border-radius:50%;object-fit:cover;">`;
  }
  const iniciais = usuario.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  return `<span style="font-weight:600;">${iniciais}</span>`;
}

export function renderizarTabela(usuarios) {
  if (usuarios.length === 0) {
    return `
      <div style="padding:40px 20px;text-align:center;color:var(--text2);">
        <i class="fas fa-users" style="font-size:3rem;opacity:.3;margin-bottom:20px;"></i>
        <p>Nenhum usuário encontrado</p>
      </div>`;
  }

  let html = `
    <table class="tabela">
      <thead>
        <tr>
          <th style="width:50px;"></th>
          <th>Nome</th>
          <th>Email Acadêmico</th>
          <th>Matrícula</th>
          <th>Campus</th>
          <th>Último Acesso</th>
          <th style="width:100px;">Ações</th>
        </tr>
      </thead>
      <tbody>`;

  usuarios.forEach(u => {
    html += `
      <tr>
        <td><div class="user-avatar">${renderizarFoto(u)}</div></td>
        <td>
          <strong>${escapeHtml(u.nome)}</strong><br>
          <small style="color:var(--text2);">${u.uid.substring(0, 12)}...</small>
        </td>
        <td>${escapeHtml(u.email_academico || 'N/A')}</td>
        <td>${escapeHtml(u.matricula || 'N/A')}</td>
        <td>
          ${u.campus_id
            ? `<span class="tag" style="background:rgba(0,212,255,.1);">${escapeHtml(u.campus_id)}</span>`
            : '<span style="color:var(--text2);font-size:12px;">Não definido</span>'}
        </td>
        <td style="font-size:12px;color:var(--text2);">${formatarData(u.ultimo_login)}</td>
        <td>
          <button class="btn btn-ghost" style="padding:4px 8px;font-size:12px;"
                  onclick="verDetalhesUsuario('${u.uid}')">
            <i class="fa fa-eye"></i> Ver
          </button>
        </td>
      </tr>`;
  });

  html += `</tbody></table>`;
  return html;
}

export function renderizarDetalhesUsuario(usuario) {
  const fotoHtml = renderizarFoto(usuario);
  return `
    <div style="background:var(--bg);border-radius:12px;padding:24px;max-width:600px;margin:0 auto;">
      <div style="display:flex;gap:20px;margin-bottom:24px;align-items:flex-start;">
        <div class="user-avatar" style="width:80px;height:80px;font-size:28px;">
          ${fotoHtml}
        </div>
        <div style="flex:1;">
          <h3 style="font-size:20px;font-weight:600;margin-bottom:4px;">${escapeHtml(usuario.nome)}</h3>
          <p style="color:var(--text2);font-size:13px;">${escapeHtml(usuario.email_academico || 'Sem email')}</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        <div style="background:rgba(255,255,255,.05);padding:12px;border-radius:8px;">
          <label style="color:var(--text2);font-size:11px;text-transform:uppercase;">Email Acadêmico</label>
          <p style="font-weight:500;margin-top:4px;">${escapeHtml(usuario.email_academico || 'N/A')}</p>
        </div>
        <div style="background:rgba(255,255,255,.05);padding:12px;border-radius:8px;">
          <label style="color:var(--text2);font-size:11px;text-transform:uppercase;">Matrícula</label>
          <p style="font-weight:500;margin-top:4px;">${escapeHtml(usuario.matricula || 'N/A')}</p>
        </div>
        <div style="background:rgba(255,255,255,.05);padding:12px;border-radius:8px;">
          <label style="color:var(--text2);font-size:11px;text-transform:uppercase;">Campus</label>
          <p style="font-weight:500;margin-top:4px;">${escapeHtml(usuario.campus_id || 'Não definido')}</p>
        </div>
        <div style="background:rgba(255,255,255,.05);padding:12px;border-radius:8px;">
          <label style="color:var(--text2);font-size:11px;text-transform:uppercase;">Role</label>
          <p style="font-weight:500;margin-top:4px;">${escapeHtml(usuario.role || 'user')}</p>
        </div>
        <div style="background:rgba(255,255,255,.05);padding:12px;border-radius:8px;grid-column:1 / -1;">
          <label style="color:var(--text2);font-size:11px;text-transform:uppercase;">UID</label>
          <p style="font-weight:500;margin-top:4px;font-size:11px;font-family:monospace;word-break:break-all;">
            ${usuario.uid}
          </p>
        </div>
      </div>

      <div style="background:rgba(255,255,255,.03);padding:12px;border-radius:8px;font-size:12px;">
        <p style="color:var(--text2);margin-bottom:8px;">
          <strong>Criado em:</strong> ${formatarData(usuario.criado_em)}
        </p>
        <p style="color:var(--text2);">
          <strong>Último acesso:</strong> ${formatarData(usuario.ultimo_login)}
        </p>
      </div>
    </div>`;
}

export function obterCampusUnicos(usuarios = usuariosCache) {
  const campi = new Set();
  usuarios.forEach(u => { if (u.campus_id) campi.add(u.campus_id); });
  return Array.from(campi).sort();
}