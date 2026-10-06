// assets/js/admin-users.js
// Gerenciamento de usuários no painel admin.
import { db, collection, getDocs } from './firebase-init.js';

let usuariosCache = [];
const CACHE_TTL = 2 * 60 * 1000;
let lastCacheTime = 0;

function parseTimestamp(ts) {
  if (!ts) return null;
  let date = null;
  if (typeof ts.toDate === 'function') date = ts.toDate();
  else if (typeof ts === 'string') date = new Date(ts);
  else if (ts instanceof Date) date = ts;
  if (date && !Number.isNaN(date.getTime())) return date;
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
        campus_admin: data.campus_admin || null,
        role: data.role || 'user',
        curso: data.curso || null,
        cpf: data.cpf || null,
        data_nascimento: data.data_nascimento || null,
        ano_ingresso: Number.isInteger(data.ano_ingresso) ? data.ano_ingresso : null,
        ano_atual: Number.isInteger(data.ano_atual) ? data.ano_atual : null,
        semestre_atual: Number.isInteger(data.semestre_atual) ? data.semestre_atual : null,
        total_acessos: Number.isFinite(data.total_acessos) ? data.total_acessos : 0,
        plataforma_origem: data.plataforma_origem || null,
        plataforma_ultima: data.plataforma_ultima || null,
        preferencias: data.preferencias || {},
        tem_suap_token: Boolean(data.suap_token),
        tem_refresh_token: Boolean(data.refresh_token),
        criado_em: parseTimestamp(data.criado_em),
        ultimo_login: parseTimestamp(data.ultimo_login),
        ultimo_acesso: parseTimestamp(data.ultimo_acesso),
      });
    });

    lastCacheTime = Date.now();
    return usuariosCache;
  } catch (err) {
    console.error('❌ Erro ao carregar usuários:', err.message);
    throw err;
  }
}

export function buscaUsuarios(termo, usuarios = usuariosCache) {
  if (!termo || termo.trim().length < 1) return usuarios;
  const t = termo.toLowerCase();
  return usuarios.filter(u =>
    u.nome.toLowerCase().includes(t) ||
    u.email_academico?.toLowerCase().includes(t) ||
    u.curso?.toLowerCase().includes(t) ||
    u.campus_id?.toLowerCase().includes(t) ||
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

export function escapeHtml(text) {
  if (!text) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function renderizarFoto(usuario) {
  if (usuario.foto_url) {
    return `<img src="${escapeHtml(usuario.foto_url)}" alt="${escapeHtml(usuario.nome)}" title="Foto do usuário" style="border-radius:50%;object-fit:cover;">`;
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
          <th>Campus</th>
          <th>Curso / ano</th>
          <th>Acessos</th>
          <th>Último acesso</th>
          <th style="width:110px;">Detalhes</th>
        </tr>
      </thead>
      <tbody>`;

  usuarios.forEach(u => {
    html += `
      <tr>
        <td><div class="user-avatar">${renderizarFoto(u)}</div></td>
        <td>
          <strong>${escapeHtml(u.nome)}</strong><br>
          <small style="color:var(--text2);">${escapeHtml(u.uid.substring(0, 12))}...</small>
        </td>
        <td>
          ${u.campus_id
            ? `<span class="tag" style="background:rgba(0,212,255,.1);">${escapeHtml(u.campus_id)}</span>`
            : '<span style="color:var(--text2);font-size:12px;">Não definido</span>'}
        </td>
        <td>
          <strong>${escapeHtml(u.curso || 'Curso não informado')}</strong><br>
          <small style="color:var(--text2);">${u.ano_atual ? `Ano ${u.ano_atual}` : 'Ano não informado'}${u.matricula ? ` · ${escapeHtml(u.matricula)}` : ''}</small>
        </td>
        <td><strong>${u.total_acessos}</strong></td>
        <td style="font-size:12px;color:var(--text2);">${formatarData(u.ultimo_acesso || u.ultimo_login)}</td>
        <td>
          <button class="btn btn-ghost" style="padding:4px 8px;font-size:12px;"
                  onclick="verDetalhesUsuario('${encodeURIComponent(u.uid).replace(/'/g, '%27')}')">
            <i class="fa fa-eye"></i> Ver
          </button>
        </td>
      </tr>`;
  });

  html += `</tbody></table>`;
  return html;
}

function percentual(parte, total) {
  return total ? Math.round((parte / total) * 100) : 0;
}

function agrupar(usuarios, obterChave) {
  const grupos = new Map();
  usuarios.forEach(usuario => {
    const chave = obterChave(usuario) || 'Não informado';
    grupos.set(chave, (grupos.get(chave) || 0) + 1);
  });
  return [...grupos.entries()].sort((a, b) => b[1] - a[1]);
}

function renderizarBarras(titulo, itens, total, cor = 'var(--accent)') {
  const top = itens.slice(0, 6);
  if (!top.length) return '';
  return `
    <article class="analytics-card">
      <h3>${titulo}</h3>
      <div class="analytics-bars">
        ${top.map(([nome, valor]) => `
          <div class="analytics-bar-row">
            <span class="analytics-bar-label" title="${escapeHtml(nome)}">${escapeHtml(nome)}</span>
            <span class="analytics-bar-track"><span style="width:${Math.max(percentual(valor, top[0][1]), 3)}%;background:${cor}"></span></span>
            <strong>${valor}</strong>
            <small>${percentual(valor, total)}%</small>
          </div>`).join('')}
      </div>
    </article>`;
}

export function renderizarPainelAnalitico(usuarios) {
  const total = usuarios.length;
  const agora = Date.now();
  const ultimoAcesso = usuario => usuario.ultimo_acesso || usuario.ultimo_login;
  const ativos30 = usuarios.filter(u => ultimoAcesso(u) && agora - ultimoAcesso(u).getTime() <= 30 * 86400000).length;
  const ativos7 = usuarios.filter(u => ultimoAcesso(u) && agora - ultimoAcesso(u).getTime() <= 7 * 86400000).length;
  const acessosTotal = usuarios.reduce((soma, u) => soma + u.total_acessos, 0);
  const mediaAcessos = total ? (acessosTotal / total).toFixed(1).replace('.', ',') : '0';
  const cursos = usuarios.filter(u => u.curso).length;
  const ingresso = usuarios.filter(u => u.ano_ingresso).length;
  const serieAcesso = [
    ['Ativos nos últimos 7 dias', ativos7, 'var(--success)'],
    ['Ativos nos últimos 30 dias', ativos30, 'var(--accent)'],
    ['Sem acesso recente', Math.max(total - ativos30, 0), 'var(--warning)'],
  ];

  return `
    <div class="user-kpis">
      <article class="user-kpi"><span>Usuários cadastrados</span><strong>${total}</strong><small>Todos os perfis no Firestore</small></article>
      <article class="user-kpi"><span>Ativos em 30 dias</span><strong>${ativos30}<small class="kpi-percent">${percentual(ativos30, total)}%</small></strong><small>${ativos7} acessaram nos últimos 7 dias</small></article>
      <article class="user-kpi"><span>Acessos registrados</span><strong>${acessosTotal}</strong><small>Média de ${mediaAcessos} por usuário</small></article>
      <article class="user-kpi"><span>Dados acadêmicos</span><strong>${cursos}<small class="kpi-percent">${percentual(cursos, total)}%</small></strong><small>${ingresso} com ano de ingresso informado</small></article>
    </div>
    <div class="analytics-grid">
      ${renderizarBarras('Usuários por campus', agrupar(usuarios, u => u.campus_id), total)}
      ${renderizarBarras('Plataforma de origem', agrupar(usuarios, u => u.plataforma_origem), total, 'var(--success)')}
      <article class="analytics-card">
        <h3>Atividade recente</h3>
        <div class="activity-bars">
          ${serieAcesso.map(([label, valor, cor]) => `
            <div class="activity-item">
              <div><span>${label}</span><strong>${valor} · ${percentual(valor, total)}%</strong></div>
              <span class="activity-track"><span style="width:${percentual(valor, total)}%;background:${cor}"></span></span>
            </div>`).join('')}
        </div>
        <p class="analytics-note">Baseado no campo de último acesso salvo para cada perfil.</p>
      </article>
      ${renderizarBarras('Ano de ingresso', agrupar(usuarios, u => u.ano_ingresso), total, 'var(--warning)')}
    </div>`;
}

export function renderizarDetalhesUsuario(usuario, usuarios = usuariosCache) {
  const fotoHtml = renderizarFoto(usuario);
  const totalAcessos = usuarios.reduce((soma, u) => soma + u.total_acessos, 0);
  const maxAcessos = Math.max(1, ...usuarios.map(u => u.total_acessos));
  const proporcaoAcessos = percentual(usuario.total_acessos, maxAcessos);
  const parcelaAcessos = percentual(usuario.total_acessos, totalAcessos);
  const ultimoAcesso = usuario.ultimo_acesso || usuario.ultimo_login;
  const diasSemAcesso = ultimoAcesso ? Math.max(0, Math.floor((Date.now() - ultimoAcesso.getTime()) / 86400000)) : null;
  const statusAcesso = diasSemAcesso === null ? 'Sem registro de acesso' : diasSemAcesso === 0 ? 'Acessou hoje' : `${diasSemAcesso} dia(s) sem acessar`;

  return `
    <div class="student-detail">
      <div class="student-hero">
        <div class="user-avatar student-avatar">
          ${fotoHtml}
        </div>
        <div style="flex:1;">
          <span class="student-eyebrow">${escapeHtml(usuario.campus_id || 'Campus não informado')} · ${escapeHtml(usuario.role)}</span>
          <h2>${escapeHtml(usuario.nome)}</h2>
          <p>${escapeHtml(usuario.email_academico || 'E-mail acadêmico não informado')}</p>
        </div>
      </div>
      <div class="student-stats">
        <article><span>Acessos</span><strong>${usuario.total_acessos}</strong><small>${parcelaAcessos}% do volume total</small></article>
        <article><span>Último acesso</span><strong>${diasSemAcesso === null ? '—' : diasSemAcesso === 0 ? 'Hoje' : `${diasSemAcesso}d`}</strong><small>${statusAcesso}</small></article>
        <article><span>Ano atual</span><strong>${usuario.ano_atual || '—'}</strong><small>${usuario.semestre_atual ? `${usuario.semestre_atual}º semestre` : 'Semestre não informado'}</small></article>
      </div>
      <div class="student-access-chart">
        <div><strong>Uso do sistema</strong><span>${proporcaoAcessos}% do maior número de acessos entre os usuários</span></div>
        <div class="student-access-track"><span style="width:${proporcaoAcessos}%"></span></div>
      </div>
      <div class="detail-columns">
        <section class="detail-section">
          <h3><i class="fas fa-id-card"></i> Perfil</h3>
          <dl>
            <div><dt>Matrícula</dt><dd>${escapeHtml(usuario.matricula || 'Não informada')}</dd></div>
            <div><dt>CPF</dt><dd>${escapeHtml(usuario.cpf || 'Não informado')}</dd></div>
            <div><dt>Nascimento</dt><dd>${escapeHtml(usuario.data_nascimento || 'Não informado')}</dd></div>
            <div><dt>UID</dt><dd class="mono">${escapeHtml(usuario.uid)}</dd></div>
          </dl>
        </section>
        <section class="detail-section">
          <h3><i class="fas fa-graduation-cap"></i> Acadêmico</h3>
          <dl>
            <div><dt>Curso</dt><dd>${escapeHtml(usuario.curso || 'Não informado')}</dd></div>
            <div><dt>Campus</dt><dd>${escapeHtml(usuario.campus_id || 'Não informado')}</dd></div>
            <div><dt>Ano de ingresso</dt><dd>${usuario.ano_ingresso || 'Não informado'}</dd></div>
            <div><dt>Ano / semestre atual</dt><dd>${usuario.ano_atual || 'Não informado'}${usuario.semestre_atual ? ` / ${usuario.semestre_atual}º` : ''}</dd></div>
          </dl>
        </section>
        <section class="detail-section">
          <h3><i class="fas fa-clock"></i> Atividade</h3>
          <dl>
            <div><dt>Criado em</dt><dd>${formatarData(usuario.criado_em)}</dd></div>
            <div><dt>Último login</dt><dd>${formatarData(usuario.ultimo_login)}</dd></div>
            <div><dt>Último acesso</dt><dd>${formatarData(usuario.ultimo_acesso)}</dd></div>
            <div><dt>Plataforma de origem</dt><dd>${escapeHtml(usuario.plataforma_origem || 'Não informada')}</dd></div>
            <div><dt>Última plataforma</dt><dd>${escapeHtml(usuario.plataforma_ultima || 'Não informada')}</dd></div>
          </dl>
        </section>
        <section class="detail-section">
          <h3><i class="fas fa-sliders-h"></i> Preferências e segurança</h3>
          <dl>
            <div><dt>Tema</dt><dd>${escapeHtml(usuario.preferencias?.tema || 'Não informado')}</dd></div>
            <div><dt>Notificações</dt><dd>${usuario.preferencias?.notificacoes === false ? 'Desativadas' : usuario.preferencias?.notificacoes === true ? 'Ativadas' : 'Não informado'}</dd></div>
            <div><dt>Token SUAP</dt><dd>${usuario.tem_suap_token ? 'Presente' : 'Ausente'}</dd></div>
            <div><dt>Refresh token</dt><dd>${usuario.tem_refresh_token ? 'Presente' : 'Ausente'}</dd></div>
          </dl>
        </section>
      </div>
    </div>`;
}

export function obterCampusUnicos(usuarios = usuariosCache) {
  const campi = new Set();
  usuarios.forEach(u => { if (u.campus_id) campi.add(u.campus_id); });
  return Array.from(campi).sort();
}