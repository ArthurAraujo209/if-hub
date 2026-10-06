// dashboard.js — Dashboard principal. Carrega dados do SUAP + mapa do campus.
// Depende de: window.IFHubConfig (config.js) e window.IFHub (auth-guard.js).

const cfg = window.IFHubConfig;
const API_URL = `${cfg.backendURL}/api`;
const DATA_URL = './assets/data/salas.json';

let dadosGlobais = null;
let dadosAluno = null;
let anoAtual = new Date().getFullYear();

let roomsDatabase = [];
let buildingData = {};

let fuseRooms, fuseBuildings;
let currentZoom = 1;
let searchTimeout = null;
let spotlightIndex = [];
let spotlightFuse = null;
let selectedSpotlightTheme = 'dark';

const appThemes = [
  { id: 'dark',       name: 'Escuro',         description: 'Visão noturna suave com contraste natural.',       palette: ['#0a0a0f', '#12121a', '#359830', '#0a84ff'] },
  { id: 'light',      name: 'Claro',          description: 'Fundo claro, alto contraste e toque limpo.',        palette: ['#f3f5f8', '#ffffff', '#0f63c8', '#1f7a2f'] },
  { id: 'contrast',   name: 'Alto Contraste', description: 'Cores fortes e leitura rápida em qualquer luz.',    palette: ['#030303', '#ffffff', '#7cff00', '#34d6ff'] },
  { id: 'forest',     name: 'Floresta',       description: 'Tom natural com verde profundo.',                   palette: ['#081b11', '#102516', '#5bba63', '#3b9fd1'] },
  { id: 'ocean',      name: 'Oceano',         description: 'Visual fresco para navegação leve e moderna.',      palette: ['#071927', '#0d2d45', '#4fd1c5', '#38bdf8'] },
  { id: 'solarized',  name: 'Solarizado',     description: 'Tons suaves para foco prolongado.',                 palette: ['#fdf6e3', '#f5e9d2', '#2aa198', '#268bd2'] },
];

// ============================================================================
// CARREGAMENTO DO MAPA
// ============================================================================
async function carregarDadosMapa() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error('Erro ao carregar JSON');
    const dados = await response.json();

    roomsDatabase = dados.salas.map(sala => ({
      id: sala.id,
      name: sala.nome,
      block: sala.bloco,
      floor: sala.andar,
      room: sala.numero,
      type: sala.tipo,
      keywords: sala.keywords || [],
    }));

    const blocosPersonalizados = {
      1: {
        nome: 'Guarita', descricao: 'Entrada principal',
        andares: { Térreo: ['Portaria'] },
        icon: 'shield-alt', cor: 'var(--ios-accent-blue)',
      },
      4: {
        nome: 'Espaço Multiuso', descricao: 'Atividades diversas',
        andares: { Térreo: ['Ginástica', 'Eventos', 'Aulas'] },
        icon: 'table-tennis', cor: 'var(--ios-accent-orange)',
      },
      6: {
        nome: 'Piscina', descricao: 'Natação',
        andares: { Externo: ['Piscina'] },
        icon: 'swimming-pool', cor: 'var(--ios-accent-blue)',
      },
      areia: {
        nome: 'Quadra de Areia', descricao: 'Esportes de praia',
        andares: { Externo: ['Vôlei de Praia', 'Futevôlei'] },
        icon: 'volleyball-ball', cor: 'var(--ios-accent-orange)',
      },
      quadra: {
        nome: 'Quadra Poliesportiva', descricao: 'Esportes',
        andares: { Externo: ['Basquete', 'Futsal', 'Handebol', 'Banho'] },
        icon: 'basketball-ball', cor: 'var(--ios-accent-orange)',
      },
      'E-ginasio': {
        nome: 'Ginásio', descricao: 'Educação Física',
        andares: { Térreo: ['Quadra', 'Academia', 'Vestiários Masculino', 'Vestiários Feminino'] },
        icon: 'dumbbell', cor: '#FF3B30',
      },
      'E-anexo': {
        nome: 'Prédio Anexo - Música e Arte', descricao: 'Laboratórios de Música e Arte',
        andares: {
          '1º Andar': ['Lab. de Música', 'Sala de Música'],
          '2º Andar': ['Coord. NUARTE', 'Lab. Cenográfico', 'Grêmio'],
        },
        icon: 'music', cor: '#FF3B30',
      },
    };

    const blocosJSON = {};
    for (const [id, bloco] of Object.entries(dados.blocos)) {
      blocosJSON[id] = {
        nome: bloco.nome, descricao: bloco.descricao,
        andares: bloco.andares, icon: bloco.icon, cor: bloco.cor,
      };
    }

    buildingData = { ...blocosPersonalizados, ...blocosJSON };
    buildSpotlightIndex();
  } catch (error) {
    console.error('❌ Erro ao carregar dados do mapa:', error);
    roomsDatabase = [];
    buildingData = {};
    showAlert('Erro ao carregar mapa. Verifique o arquivo de dados.');
  }
}

// ============================================================================
// BUSCA INTELIGENTE (Fuse)
// ============================================================================
function initializeFuse() {
  fuseRooms = new Fuse(roomsDatabase, {
    includeScore: true, threshold: 0.4, ignoreLocation: true,
    findAllMatches: true, minMatchCharLength: 2,
    keys: [
      { name: 'name', weight: 2 },
      { name: 'keywords', weight: 1.5 },
      { name: 'room', weight: 1 },
      { name: 'block', weight: 1 },
    ],
  });

  const buildingArray = Object.entries(buildingData).map(([id, data]) => ({
    id, nome: data.nome, descricao: data.descricao,
    icon: data.icon, cor: data.cor, andares: data.andares,
  }));

  fuseBuildings = new Fuse(buildingArray, {
    includeScore: true, threshold: 0.4, keys: ['nome', 'descricao'],
  });
}

function performSmartSearch() {
  const input = document.getElementById('room-search');
  if (!input) return;
  const query = input.value.trim();
  if (!query || query.length < 2) {
    document.getElementById('autocomplete-suggestions').classList.remove('show');
    return;
  }
  if (!fuseRooms) initializeFuse();

  const roomResults = fuseRooms.search(query);
  const buildingResults = fuseBuildings.search(query);

  const allResults = [
    ...roomResults.map(r => ({ item: r.item, score: r.score, type: 'room' })),
    ...buildingResults.map(b => ({ item: b.item, score: b.score, type: 'building' })),
  ].sort((a, b) => (a.score || 1) - (b.score || 1)).slice(0, 8);

  showSuggestions(allResults, query);
}

function clearSearch() {
  const input = document.getElementById('room-search');
  if (input) input.value = '';
  document.getElementById('autocomplete-suggestions').classList.remove('show');
  closeResultPanel();
  document.querySelectorAll('.building-3d').forEach(b => b.classList.remove('active', 'highlight'));
}

function closeResultPanel() {
  const c = document.getElementById('search-result-container');
  if (c) { c.style.display = 'none'; c.classList.remove('show'); }
}

function showSuggestions(results, query) {
  const container = document.getElementById('autocomplete-suggestions');
  if (!container) return;

  if (results.length === 0) {
    container.innerHTML = `
      <div style="padding:20px;text-align:center;color:var(--ios-text-secondary);">
        <i class="fas fa-search" style="font-size:2rem;opacity:.5;margin-bottom:10px;"></i>
        <p>Nenhum resultado para "${escapeHtml(query)}"</p>
        <small>Tente: bibli, lab, 101, cantina...</small>
      </div>`;
    container.classList.add('show');
    return;
  }

  let html = '';
  results.forEach(result => {
    if (result.type === 'room') {
      const room = result.item;
      html += `
        <div class="suggestion-item" onclick="selectRoom('${room.id}')">
          <i class="fas fa-door-open" style="color:var(--ios-accent-green);width:30px;"></i>
          <div style="flex:1;">
            <div style="font-weight:600;">${highlightMatch(room.name, query)}</div>
            <div style="font-size:.8rem;color:var(--ios-text-secondary);">
              Bloco ${room.block} • ${room.room}
            </div>
          </div>
        </div>`;
    } else {
      const b = result.item;
      html += `
        <div class="suggestion-item" onclick="selectBuilding('${b.id}')">
          <i class="fas fa-building" style="color:var(--ios-accent-blue);width:30px;"></i>
          <div style="flex:1;">
            <div style="font-weight:600;">${highlightMatch(b.nome, query)}</div>
            <div style="font-size:.8rem;color:var(--ios-text-secondary);">
              ${b.descricao.substring(0, 40)}...
            </div>
          </div>
        </div>`;
    }
  });

  container.innerHTML = html;
  container.classList.add('show');
}

function handleSearchInput() {
  const input = document.getElementById('room-search');
  if (!input) return;
  const query = input.value;
  if (searchTimeout) clearTimeout(searchTimeout);
  if (query.length >= 2) {
    searchTimeout = setTimeout(() => performSmartSearch(), 300);
  } else {
    document.getElementById('autocomplete-suggestions').classList.remove('show');
  }
}

function selectRoom(roomId) {
  const room = roomsDatabase.find(r => r.id === roomId);
  if (!room) return;
  document.getElementById('autocomplete-suggestions').classList.remove('show');
  document.getElementById('room-search').value = room.name;
  showRoomDetails(room);
  highlightBuilding(room.block);
}

function selectBuilding(buildingId) {
  const building = buildingData[buildingId];
  if (!building) return;
  document.getElementById('autocomplete-suggestions').classList.remove('show');
  document.getElementById('room-search').value = building.nome;
  showBuildingDetails(buildingId, building);
  highlightBuilding(buildingId);
}

function showRoomDetails(room) {
  const container = document.getElementById('search-result-container');
  const title = document.getElementById('search-result-title');
  const content = document.getElementById('search-result-content');
  if (!container) return;

  title.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
      <div style="display:flex;align-items:center;gap:12px;">
        <i class="fas fa-door-open" style="color:var(--ios-accent-green);"></i>
        <span>${room.name}</span>
        <span style="background:var(--gradient-primary);padding:4px 12px;border-radius:20px;font-size:.8rem;">Bloco ${room.block}</span>
      </div>
      <button onclick="closeResultPanel()" class="close-panel" style="background:rgba(255,255,255,.1);border:none;color:white;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <i class="fas fa-times"></i>
      </button>
    </div>`;

  content.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;">
      <div style="background:rgba(255,255,255,.05);padding:15px;border-radius:12px;">
        <i class="fas fa-door-closed"></i><div><strong>Sala</strong><br>${room.room}</div>
      </div>
      <div style="background:rgba(255,255,255,.05);padding:15px;border-radius:12px;">
        <i class="fas fa-building"></i><div><strong>Bloco</strong><br>${room.block}</div>
      </div>
      <div style="background:rgba(255,255,255,.05);padding:15px;border-radius:12px;">
        <i class="fas fa-layer-group"></i><div><strong>Andar</strong><br>${room.floor}</div>
      </div>
      <div style="background:rgba(255,255,255,.05);padding:15px;border-radius:12px;">
        <i class="fas fa-tag"></i><div><strong>Tipo</strong><br>${room.type}</div>
      </div>
    </div>
    <button class="ios-btn result-action-btn" onclick="resetMap()" style="margin-top:20px;">
      <i class="fas fa-sync-alt"></i> Resetar Visualização
    </button>`;

  container.style.display = 'block';
  container.classList.add('show');
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showBuildingDetails(buildingId, building) {
  const container = document.getElementById('search-result-container');
  const title = document.getElementById('search-result-title');
  const content = document.getElementById('search-result-content');
  if (!container) return;

  title.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
      <div style="display:flex;align-items:center;gap:12px;">
        <i class="fas fa-${building.icon}" style="color:${building.cor};"></i>
        <span>${building.nome}</span>
      </div>
      <button onclick="closeResultPanel()" class="close-panel" style="background:rgba(255,255,255,.1);border:none;color:white;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <i class="fas fa-times"></i>
      </button>
    </div>`;

  let andaresHtml = '';
  for (const [andar, salas] of Object.entries(building.andares)) {
    andaresHtml += `
      <div style="background:rgba(255,255,255,.05);padding:15px;border-radius:12px;margin-bottom:10px;">
        <div style="font-weight:600;color:var(--ios-accent-green);margin-bottom:5px;">${andar}</div>
        <div style="color:var(--ios-text-secondary);">${salas.join(' • ')}</div>
      </div>`;
  }

  content.innerHTML = `
    <p style="color:var(--ios-text-secondary);margin-bottom:20px;">${building.descricao}</p>
    <h4 style="margin-bottom:15px;">Andares</h4>
    ${andaresHtml}
    <button class="ios-btn result-action-btn" onclick="resetMap()" style="margin-top:20px;">
      <i class="fas fa-sync-alt"></i> Resetar Visualização
    </button>`;

  container.style.display = 'block';
  container.classList.add('show');
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function highlightBuilding(buildingId) {
  document.querySelectorAll('.building-3d').forEach(b => b.classList.remove('active', 'highlight'));
  const building = document.querySelector(`[data-id="${buildingId}"]`);
  if (building) building.classList.add('active', 'highlight');
}

function zoomMap(factor) {
  currentZoom *= factor;
  currentZoom = Math.max(0.5, Math.min(3, currentZoom));
  const image = document.getElementById('campus-image');
  if (image) image.style.transform = `scale(${currentZoom})`;
}

function resetMap() {
  currentZoom = 1;
  const image = document.getElementById('campus-image');
  if (image) image.style.transform = 'scale(1)';
  document.querySelectorAll('.building-3d').forEach(b => b.classList.remove('active', 'highlight'));
  const container = document.getElementById('search-result-container');
  if (container) { container.style.display = 'none'; container.classList.remove('show'); }
  const input = document.getElementById('room-search');
  if (input) input.value = '';
  document.getElementById('autocomplete-suggestions').classList.remove('show');
}

function filterByCategory(category) {
  const searchInput = document.getElementById('room-search');
  if (!searchInput) return;
  const categoryMap = {
    lab: 'laboratório',
    biblioteca: 'biblioteca',
    esporte: 'quadra ginásio',
    alimentacao: 'cantina refeitório',
  };
  searchInput.value = categoryMap[category] || category;
  performSmartSearch();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);
  try {
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    return escapeHtml(text).replace(regex,
      '<mark style="background:rgba(48,209,88,.3);padding:2px;border-radius:3px;">$1</mark>');
  } catch { return escapeHtml(text); }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// HELPERS DE DADOS
// ============================================================================
function safeArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.results && Array.isArray(data.results)) return data.results;
  if (typeof data === 'object') return [data];
  return [];
}

function safeObject(data) {
  if (!data) return {};
  if (typeof data === 'object' && !Array.isArray(data)) return data;
  return {};
}

function parseHorario(codigo) {
  if (!codigo || codigo.length < 3) return null;
  const dia = parseInt(codigo[0]);
  const turno = codigo[1];
  const horas = codigo.substring(2).split('').map(h => parseInt(h));
  const diasNomes = ['', 'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const turnosNomes = { M: 'Manhã', V: 'Tarde', N: 'Noite' };
  return {
    dia,
    diaNome: diasNomes[dia] || '',
    turno,
    turnoNome: turnosNomes[turno] || turno,
    horas,
    horasStr: horas.join('ª, ') + 'ª',
  };
}

function formatarData(dataStr) {
  if (!dataStr) return 'Data não definida';
  try {
    const [ano, mes, dia] = dataStr.split('T')[0].split('-');
    const data = new Date(ano, mes - 1, dia);
    return data.toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return dataStr; }
}

// ============================================================================
// NAVBAR MOBILE (GSAP)
// ============================================================================
const indicator = document.getElementById('navIndicator');
const menuItems = document.querySelectorAll('.mobile-menu-item');

let _isDragging = false;
let _dragStartX = 0;
let _currentItem = null;
let _touchMoved = false;

function _itemGeometry(el) {
  const rect = el.getBoundingClientRect();
  const menuRect = el.parentElement.getBoundingClientRect();
  return { left: rect.left - menuRect.left, width: rect.width };
}

function _slideBubbleTo(el, instant = false) {
  if (!el) return;
  const { left, width } = _itemGeometry(el);
  if (instant) {
    gsap.set(indicator, { x: left, width });
  } else {
    gsap.to(indicator, { x: left, width, duration: 0.32, ease: 'power3.out' });
  }
}

function _bubbleTap(el) {
  const { left, width } = _itemGeometry(el);
  gsap.set(indicator, { x: left, width });
  gsap.timeline()
    .to(indicator, { scaleX: 1.18, scaleY: 0.82, duration: 0.12, ease: 'power2.out' })
    .to(indicator, { scaleX: 0.94, scaleY: 1.06, duration: 0.18, ease: 'power2.inOut' })
    .to(indicator, { scaleX: 1, scaleY: 1, duration: 0.26, ease: 'elastic.out(1, 0.5)' });
}

function _navigateBubbleTo(el) {
  if (!el) return;
  const { left, width } = _itemGeometry(el);
  gsap.to(indicator, { x: left, width, duration: 0.42, ease: 'power4.out' });
  gsap.timeline({ delay: 0.1 })
    .to(indicator, { scaleX: 1.1, scaleY: 0.88, duration: 0.14, ease: 'power2.out' })
    .to(indicator, { scaleX: 1, scaleY: 1, duration: 0.28, ease: 'elastic.out(1, 0.45)' });
}

window.addEventListener('load', () => {
  const activeItem = document.querySelector('.mobile-menu-item.active');
  if (activeItem && indicator) {
    const { left, width } = _itemGeometry(activeItem);
    gsap.set(indicator, { x: left, width, scaleX: 1, scaleY: 1 });
  }

  loadThemeFromStorage();
  renderThemeTiles();

  const headerSearchButton = document.querySelector('.header-search-btn');
  if (headerSearchButton) {
    headerSearchButton.addEventListener('click', (e) => { e.preventDefault(); openSpotlight(); });
  }
  const mobileSearchButton = document.querySelector('.mobile-search');
  if (mobileSearchButton) {
    mobileSearchButton.addEventListener('click', (e) => { e.preventDefault(); openSpotlight(); });
  }
});

window.addEventListener('keydown', (event) => {
  const isCommand = event.metaKey || event.ctrlKey;
  if (isCommand && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openSpotlight();
  }
  if (event.key === 'Escape') {
    closeSpotlight();
    closeThemePicker();
  }
});

function showSection(sectionName, event) {
  if (event) event.preventDefault();

  menuItems.forEach(item => item.classList.remove('active'));

  let activeItem;
  if (event && event.currentTarget && event.currentTarget.classList.contains('mobile-menu-item')) {
    activeItem = event.currentTarget;
  } else {
    activeItem = Array.from(menuItems).find(item =>
      item.getAttribute('onclick') && item.getAttribute('onclick').includes(sectionName));
  }

  if (activeItem) {
    activeItem.classList.add('active');
    if (!_isDragging) _navigateBubbleTo(activeItem);
  }

  document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
  const sidebarLink = Array.from(document.querySelectorAll('.sidebar .nav-link')).find(l => {
    const onclick = l.getAttribute('onclick');
    return onclick && onclick.includes(sectionName);
  });
  if (sidebarLink) sidebarLink.classList.add('active');

  document.querySelectorAll('.header-nav-link').forEach(l => l.classList.remove('active'));
  const headerLink = Array.from(document.querySelectorAll('.header-nav-link')).find(l => {
    const onclick = l.getAttribute('onclick');
    return onclick && onclick.includes(sectionName);
  });
  if (headerLink) headerLink.classList.add('active');

  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  const targetSection = document.getElementById(`${sectionName}-section`);
  if (targetSection) targetSection.classList.add('active');

  const titles = {
    dashboard:  '<i class="fas fa-home"></i> Dashboard',
    boletim:    '<i class="fas fa-file-alt"></i> Boletim',
    horarios:   '<i class="fas fa-clock"></i> Horários',
    turmas:     '<i class="fas fa-users"></i> Turmas',
    mapa:       '<i class="fas fa-map-marked-alt"></i> Mapa do Campus',
    avaliacoes: '<i class="fas fa-clipboard-list"></i> Avaliações',
    periodos:   '<i class="fas fa-calendar-alt"></i> Períodos',
    perfil:     '<i class="fas fa-user"></i> Perfil',
    calculadora:'<i class="fas fa-calculator"></i> Calculadora',
  };
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) pageTitle.innerHTML = titles[sectionName] || titles.dashboard;

  if (window.innerWidth <= 1024) closeSidebar();
}

menuItems.forEach(item => {
  item.addEventListener('touchstart', (e) => {
    _touchMoved = false;
    _isDragging = false;
    _currentItem = item;
    _dragStartX = e.touches[0].clientX;
    _bubbleTap(item);
  }, { passive: true });

  item.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - _dragStartX);
    if (deltaX > 6) { _touchMoved = true; _isDragging = true; }
    if (!_isDragging) return;

    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const hoveredItem = el?.closest('.mobile-menu-item');

    if (hoveredItem && hoveredItem !== _currentItem) {
      _currentItem = hoveredItem;
      _slideBubbleTo(hoveredItem, false);
      if (navigator.vibrate) navigator.vibrate(6);
    }
  }, { passive: true });

  item.addEventListener('touchend', () => {
    if (_isDragging && _currentItem) {
      const onclickAttr = _currentItem.getAttribute('onclick');
      if (onclickAttr) {
        const match = onclickAttr.match(/'([^']+)'/);
        if (match) {
          showSection(match[1]);
          if (navigator.vibrate) navigator.vibrate(10);
        }
      }
      _navigateBubbleTo(_currentItem);
    }
    _isDragging = false;
    _currentItem = null;
  }, { passive: true });
});

function toggleSidebarDesktop() {
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  sidebar.classList.toggle('sidebar-collapsed');
  mainContent.classList.toggle('expanded');
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const icon = document.getElementById('menu-toggle-icon');
  const mobileMenu = document.getElementById('mobileMenu');

  sidebar.classList.toggle('open');
  if (sidebar.classList.contains('open')) {
    overlay.style.display = 'block';
    icon.classList.remove('fa-bars');
    icon.classList.add('fa-arrow-left');
    mobileMenu.style.display = 'none';
  } else {
    overlay.style.display = 'none';
    icon.classList.remove('fa-arrow-left');
    icon.classList.add('fa-bars');
    mobileMenu.style.display = 'flex';
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const icon = document.getElementById('menu-toggle-icon');
  const mobileMenu = document.getElementById('mobileMenu');
  sidebar.classList.remove('open');
  overlay.style.display = 'none';
  icon.classList.remove('fa-arrow-left');
  icon.classList.add('fa-bars');
  mobileMenu.style.display = 'flex';
}

// ============================================================================
// TEMAS
// ============================================================================
function openThemePicker() {
  const overlay = document.getElementById('theme-picker-overlay');
  if (!overlay) return;
  overlay.removeAttribute('hidden');
  selectedSpotlightTheme = localStorage.getItem('simplif_theme') || 'dark';
  renderThemeTiles();
}

function closeThemePicker() {
  const overlay = document.getElementById('theme-picker-overlay');
  if (!overlay) return;
  overlay.setAttribute('hidden', '');
}

function renderThemeTiles() {
  const container = document.getElementById('themeGrid');
  if (!container) return;
  container.innerHTML = appThemes.map(theme => `
    <div class="theme-card ${theme.id === selectedSpotlightTheme ? 'active' : ''}" onclick="selectTheme('${theme.id}')">
      <div class="theme-swatch">
        <span style="background:${theme.palette[0]};"></span>
        <span style="background:${theme.palette[1]};"></span>
        <span style="background:${theme.palette[2]};"></span>
        <span style="background:${theme.palette[3]};"></span>
      </div>
      <div>
        <strong>${theme.name}</strong>
        <p>${theme.description}</p>
      </div>
    </div>`).join('');
}

function selectTheme(themeId) {
  selectedSpotlightTheme = themeId;
  renderThemeTiles();
  applyTheme(themeId);
}

function applyTheme(themeId) {
  document.body.classList.remove('theme-light', 'theme-contrast', 'theme-forest', 'theme-ocean', 'theme-solarized', 'theme-dark');
  if (themeId !== 'dark') document.body.classList.add(`theme-${themeId}`);
  localStorage.setItem('simplif_theme', themeId);
}

function loadThemeFromStorage() {
  const saved = localStorage.getItem('simplif_theme') || 'dark';
  selectedSpotlightTheme = saved;
  applyTheme(saved);
}

// ============================================================================
// SPOTLIGHT (CMD/Ctrl+K)
// ============================================================================
function openSpotlight() {
  const overlay = document.getElementById('spotlight-overlay');
  const input = document.getElementById('spotlight-search');
  if (!overlay || !input) return;
  overlay.removeAttribute('hidden');
  document.body.classList.add('spotlight-open');
  buildSpotlightIndex();
  input.value = '';
  updateSpotlightSearch();
  setTimeout(() => input.focus(), 50);
}

function closeSpotlight() {
  const overlay = document.getElementById('spotlight-overlay');
  const input = document.getElementById('spotlight-search');
  if (!overlay) return;
  overlay.setAttribute('hidden', '');
  document.body.classList.remove('spotlight-open');
  if (input) input.value = '';
}

function buildSpotlightIndex() {
  const items = [];

  const sections = [
    { id: 'dashboard',  type: 'section', title: 'Dashboard',       subtitle: 'Visão geral',         icon: 'home',            tags: ['dashboard', 'início', 'home'] },
    { id: 'boletim',    type: 'section', title: 'Boletim',         subtitle: 'Notas e médias',      icon: 'file-alt',        tags: ['boletim', 'notas', 'media'] },
    { id: 'horarios',   type: 'section', title: 'Horários',        subtitle: 'Aulas e cronograma',  icon: 'clock',           tags: ['horários', 'aulas', 'cronograma'] },
    { id: 'turmas',     type: 'section', title: 'Turmas',          subtitle: 'Disciplinas',         icon: 'users',           tags: ['turmas', 'disciplinas'] },
    { id: 'mapa',       type: 'section', title: 'Mapa do Campus',  subtitle: 'Localize salas',      icon: 'map-marked-alt',  tags: ['mapa', 'campus', 'salas', 'blocos'] },
    { id: 'avaliacoes', type: 'section', title: 'Avaliações',      subtitle: 'Provas e trabalhos',  icon: 'clipboard-list',  tags: ['avaliações', 'provas'] },
    { id: 'periodos',   type: 'section', title: 'Períodos',        subtitle: 'Cronograma',          icon: 'calendar-alt',    tags: ['períodos', 'ano'] },
    { id: 'perfil',     type: 'section', title: 'Perfil',          subtitle: 'Informações pessoais',icon: 'user',            tags: ['perfil', 'conta'] },
  ];
  items.push(...sections);

  const actions = [
    { id: 'action_boletim',   type: 'action', title: 'Ver boletim completo',       subtitle: 'Abrir notas',  icon: 'file-alt',        action: 'boletim',    tags: ['boletim', 'notas', 'ver'] },
    { id: 'action_horarios',  type: 'action', title: 'Ver horários da semana',    subtitle: 'Agenda',       icon: 'clock',           action: 'horarios',   tags: ['horários', 'agenda'] },
    { id: 'action_mapa',      type: 'action', title: 'Ir para o mapa',            subtitle: 'Buscar salas', icon: 'map-marked-alt',  action: 'mapa',       tags: ['mapa', 'salas'] },
    { id: 'action_perfil',    type: 'action', title: 'Ver meu perfil',            subtitle: 'Meus dados',   icon: 'user',            action: 'perfil',     tags: ['perfil', 'dados'] },
  ];
  items.push(...actions);

  if (roomsDatabase.length > 0) {
    items.push(...roomsDatabase.map(room => ({
      id: `room_${room.id}`,
      type: 'room',
      title: room.name,
      subtitle: `Bloco ${room.block} • Sala ${room.room}`,
      icon: 'door-open',
      action: 'room',
      data: room.id,
      tags: [room.name, room.block, room.room, ...room.keywords],
    })));
  }

  if (Object.keys(buildingData).length > 0) {
    items.push(...Object.entries(buildingData).map(([id, building]) => ({
      id: `building_${id}`,
      type: 'building',
      title: building.nome,
      subtitle: building.descricao || 'Bloco do campus',
      icon: building.icon || 'building',
      action: 'building',
      data: id,
      tags: [building.nome, building.descricao || '', ...Object.keys(building.andares || {})],
    })));
  }

  if (dadosGlobais) {
    safeArray(dadosGlobais.boletim).forEach(d => {
      if (!d.disciplina) return;
      items.push({
        id: `disciplina_${d.disciplina}`,
        type: 'disciplina',
        title: d.disciplina,
        subtitle: `Média: ${d.media_final_disciplina || d.media_disciplina || '--'} • ${d.situacao || 'Cursando'}`,
        icon: 'book', action: 'boletim', data: d.disciplina,
        tags: [d.disciplina, d.situacao || '', 'matéria', 'disciplina'],
      });
    });

    safeArray(dadosGlobais.avaliacoes?.proximas).forEach((av, index) => {
      items.push({
        id: `avaliacao_${index}`, type: 'avaliacao',
        title: av.descricao || 'Avaliação',
        subtitle: `${av.componente_curricular || ''} • ${av.data || ''}`,
        icon: 'clipboard-list', action: 'avaliacoes', data: av,
        tags: [av.descricao || '', av.componente_curricular || '', 'prova'],
      });
    });

    safeArray(dadosGlobais.turmas).forEach(t => {
      if (!t.nome_componente) return;
      items.push({
        id: `turma_${t.nome_componente}`, type: 'turma',
        title: t.nome_componente,
        subtitle: t.horarios_de_aula ? `Horários: ${t.horarios_de_aula}` : 'Turma cadastrada',
        icon: 'users', action: 'turmas', data: t,
        tags: [t.nome_componente, t.horarios_de_aula || '', 'turma'],
      });
      if (t.horarios_de_aula) {
        t.horarios_de_aula.split(' / ').forEach(code => {
          items.push({
            id: `horario_${t.nome_componente}_${code}`, type: 'horario',
            title: `${t.nome_componente} - ${code}`,
            subtitle: 'Horário de aula',
            icon: 'clock', action: 'horarios', data: t,
            tags: [t.nome_componente, code, 'horário', 'aula'],
          });
        });
      }
    });

    safeArray(dadosGlobais.periodos).forEach(p => {
      items.push({
        id: `periodo_${p.ano_letivo || p.nome}`, type: 'periodo',
        title: p.nome || `Ano ${p.ano_letivo}`,
        subtitle: p.ano_letivo ? `Ano letivo ${p.ano_letivo}` : 'Período acadêmico',
        icon: 'calendar-alt', action: 'periodos', data: p,
        tags: [p.nome || '', p.ano_letivo || '', 'período'],
      });
    });
  }

  spotlightIndex = items;
  spotlightFuse = new Fuse(spotlightIndex, {
    includeScore: true, threshold: 0.35, ignoreLocation: true,
    keys: [
      { name: 'title', weight: 2 },
      { name: 'subtitle', weight: 1 },
      { name: 'tags', weight: 1 },
    ],
  });
}

function updateSpotlightSearch() {
  const input = document.getElementById('spotlight-search');
  const resultsContainer = document.getElementById('spotlight-results');
  if (!input || !resultsContainer) return;

  const query = input.value.trim();
  let results = [];

  if (!query) {
    results = spotlightIndex
      .filter(item => item.type === 'section' || item.type === 'action')
      .slice(0, 6);
  } else if (spotlightFuse) {
    results = spotlightFuse.search(query).slice(0, 10).map(r => r.item);
  }

  renderSpotlightResults(results, query);
}

function renderSpotlightResults(results, query = '') {
  const container = document.getElementById('spotlight-results');
  if (!container) return;

  if (!results.length) {
    container.innerHTML = `
      <div class="spotlight-empty">
        <i class="fas fa-search"></i>
        <div>Nenhum resultado encontrado.</div>
      </div>`;
    return;
  }

  container.innerHTML = results.map((item, index) => {
    const title = highlightMatch(item.title, query);
    const subtitle = highlightMatch(item.subtitle || '', query);
    const badges = item.tags
      ? item.tags.slice(0, 3).map(tag => `<span class="spotlight-pill">${escapeHtml(tag)}</span>`).join('')
      : '';
    return `
      <div class="spotlight-item" onclick="executeSpotlightItem(${index})">
        <div class="spotlight-item-icon"><i class="fas fa-${item.icon}"></i></div>
        <div class="spotlight-item-content">
          <div class="spotlight-item-title">${title}</div>
          <div class="spotlight-item-subtitle">${subtitle}</div>
          <div class="spotlight-tag">${badges}</div>
        </div>
      </div>`;
  }).join('');
}

function executeSpotlightItem(index) {
  const query = document.getElementById('spotlight-search')?.value || '';
  const results = query && spotlightFuse
    ? spotlightFuse.search(query).slice(0, 10).map(r => r.item)
    : spotlightIndex;
  const selected = results[index] || spotlightIndex[index];
  if (!selected) return;

  closeSpotlight();

  switch (selected.type) {
    case 'section':
    case 'action':
      showSection(selected.action || selected.id);
      break;
    case 'room':       showSection('mapa');       selectRoom(selected.data);     break;
    case 'building':   showSection('mapa');       selectBuilding(selected.data); break;
    case 'disciplina': showSection('boletim');                                    break;
    case 'avaliacao':  showSection('avaliacoes');                                 break;
    case 'turma':      showSection('turmas');                                     break;
    case 'horario':    showSection('horarios');                                   break;
    case 'periodo':    showSection('periodos');                                   break;
    default: if (selected.action) showSection(selected.action);
  }
}

function handleSpotlightKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    const query = event.target.value.trim();
    const results = query && spotlightFuse
      ? spotlightFuse.search(query).slice(0, 10).map(r => r.item)
      : spotlightIndex;
    if (results.length) executeSpotlightItem(0);
  }
}

// ============================================================================
// AUTENTICAÇÃO E FETCH
// ============================================================================
async function logout() {
  try {
    await fetch(cfg.api.logout(), { method: 'POST', credentials: 'include' });
  } catch {}
  localStorage.removeItem('suap_token');
  window.location.href = '/index.html';
}

function showAlert(message, type = 'error') {
  const container = document.getElementById('alert-container');
  if (!container) return;
  const icon = type === 'error' ? 'exclamation-circle' : 'check-circle';
  const className = type === 'error' ? 'alert-error' : 'alert-success';
  container.innerHTML = `
    <div class="ios-alert ${className}">
      <i class="fas fa-${icon}"></i>
      <span style="font-weight:500;">${message}</span>
    </div>`;
  setTimeout(() => (container.innerHTML = ''), 5000);
}

function mostrarLoading() {
  const el = document.getElementById('loading');
  if (el) el.style.display = 'flex';
}

function esconderLoading() {
  const el = document.getElementById('loading');
  if (el) el.style.display = 'none';
}

async function trocarAno(novoAno) {
  anoAtual = parseInt(novoAno);
  mostrarLoading();
  await carregarDadosAno(anoAtual);
  esconderLoading();
}

// Fetch com renovação automática de token SUAP (401)
async function fetchComRefresh(url, options = {}) {
  let token = localStorage.getItem('suap_token');

  let response = await fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    const { auth } = await import('./firebase-init.js');
    const user = auth.currentUser;
    if (!user) { window.location.href = '/index.html'; return null; }

    const refreshRes = await fetch(cfg.api.refresh(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid }),
    });

    if (!refreshRes.ok) {
      localStorage.removeItem('suap_token');
      window.location.href = '/index.html';
      return null;
    }

    const data = await refreshRes.json();
    localStorage.setItem('suap_token', data.suap_token);
    token = data.suap_token;

    response = await fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    });
  }

  return response;
}

// ❌ REMOVIDO: validarCampus() — o auth-guard já carrega `campus.ativo`.
//    A chamada extra à API sempre retornava `true` porque `dadosAluno.campus_id`
//    nunca existe (o SUAP retorna `campus`, não `campus_id`).

async function carregarDadosAluno() {
  const token = localStorage.getItem('suap_token');
  if (!token) { window.location.href = '/index.html'; return; }

  try {
    const response = await fetchComRefresh(cfg.api.me());
    if (!response || response.status === 401) {
      localStorage.removeItem('suap_token');
      window.location.href = '/index.html';
      return;
    }
    const data = await response.json();
    dadosAluno = data.aluno;
    preencherSidebar({ aluno: dadosAluno });
    preencherPerfil({ aluno: dadosAluno });
  } catch (error) {
    console.error('Erro ao carregar dados do aluno:', error);
  }
}

async function carregarDadosAno(ano) {
  try {
    const response = await fetchComRefresh(cfg.api.dashboard(ano));
    if (!response || response.status === 401) {
      localStorage.removeItem('suap_token');
      showAlert('Sessão expirada. Faça login novamente.');
      setTimeout(() => (window.location.href = '/index.html'), 2000);
      return;
    }
    const data = await response.json();
    dadosGlobais = { ...data, aluno: dadosAluno };

    if (data.erro) { showAlert(data.erro); return; }

    preencherDashboard(dadosGlobais);
    preencherPeriodos(dadosGlobais);
    preencherAvaliacoes(dadosGlobais);
    preencherBoletim(dadosGlobais);
    preencherHorarios(dadosGlobais);

    // ✅ FIX: usa o campus já carregado pelo auth-guard em vez de chamada extra.
    if (window.IFHub?.campus?.ativo === false && dadosGlobais.turmas) {
      dadosGlobais.turmas = dadosGlobais.turmas.map(t => ({ ...t, horarios_de_aula: null }));
    }

    preencherTurmas(dadosGlobais);
    buildSpotlightIndex();
  } catch (error) {
    console.error('Erro:', error);
    showAlert('Erro ao carregar dados: ' + error.message);
  }
}

async function carregarDados() {
  mostrarLoading();
  await carregarDadosAluno();
  await carregarDadosAno(anoAtual);
  esconderLoading();
}

// ============================================================================
// PREENCHIMENTO DE UI
// ============================================================================
function preencherSidebar(data) {
  const aluno = safeObject(data.aluno);
  const nome = aluno.nome_usual || aluno.nome || 'Aluno';
  const matricula = aluno.matricula || '';
  const foto = aluno.foto || aluno.url_foto_75x100;

  const nomeEl = document.getElementById('sidebar-nome');
  const matEl = document.getElementById('sidebar-matricula');
  if (nomeEl) nomeEl.textContent = nome;
  if (matEl) matEl.textContent = matricula;

  const avatarEl = document.getElementById('sidebar-avatar');
  if (avatarEl) {
    if (foto) {
      avatarEl.innerHTML = `<img src="${foto}" alt="Foto" onerror="this.style.display='none';this.parentElement.innerHTML='<span>${nome.charAt(0)}</span>'">`;
    } else {
      avatarEl.innerHTML = `<span>${nome.charAt(0).toUpperCase()}</span>`;
    }
  }
}

function preencherDashboard(data) {
  const aluno = safeObject(data.aluno);
  const boletim = safeArray(data.boletim);

  const cardIra = document.getElementById('card-ira');
  const cardFreq = document.getElementById('card-frequencia');
  const cardFaltas = document.getElementById('card-faltas');

  if (cardIra) cardIra.textContent = aluno.ira || '--';

  if (cardFreq) {
    let totalFreq = 0, count = 0;
    boletim.forEach(d => {
      const f = parseFloat(d.percentual_carga_horaria_frequentada);
      if (!isNaN(f)) { totalFreq += f; count++; }
    });
    cardFreq.textContent = count > 0 ? (totalFreq / count).toFixed(1) + '%' : '--';
  }

  if (cardFaltas) {
    cardFaltas.textContent = boletim.reduce((sum, d) => sum + (parseInt(d.numero_faltas) || 0), 0);
  }

  const containerAval = document.getElementById('dashboard-avaliacoes');
  const avaliacoes = data.avaliacoes ? safeArray(data.avaliacoes.proximas) : [];

  if (containerAval) {
    if (avaliacoes.length === 0) {
      containerAval.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-check"></i><p>Nenhuma avaliação agendada</p></div>`;
    } else {
      containerAval.innerHTML = avaliacoes.slice(0, 3).map(av => `
        <div class="timeline-item" style="margin-bottom:16px;">
          <div class="timeline-date"><i class="fas fa-clock"></i> ${formatarData(av.data)}</div>
          <div class="timeline-title">${av.descricao || 'Avaliação'}</div>
          <div class="timeline-desc">${av.diario || av.componente_curricular || ''}</div>
        </div>`).join('');
    }
  }

  const containerBoletim = document.getElementById('dashboard-boletim-resumo');
  if (containerBoletim) {
    if (boletim.length === 0) {
      containerBoletim.innerHTML = `<div class="empty-state"><i class="fas fa-file-alt"></i><p>Nenhuma disciplina</p></div>`;
    } else {
      containerBoletim.innerHTML = boletim.slice(0, 5).map(d => {
        const media = parseFloat(d.media_final_disciplina) || parseFloat(d.media_disciplina) || 0;
        let cls = 'tag-cursando';
        if (d.situacao === 'Aprovado') cls = 'tag-aprovado';
        else if (d.situacao === 'Reprovado') cls = 'tag-reprovado';
        return `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:18px;background:rgba(255,255,255,.03);border-radius:16px;margin-bottom:12px;border:1px solid var(--glass-border);">
            <div>
              <div style="font-weight:600;margin-bottom:4px;">${d.disciplina || 'Disciplina'}</div>
              <div style="font-size:.85rem;color:var(--ios-text-secondary);">Média: ${media || '--'}</div>
            </div>
            <span class="situacao-badge ${cls}">${d.situacao || 'Cursando'}</span>
          </div>`;
      }).join('');
    }
  }

  preencherHorariosHoje(data);
}

function preencherHorariosHoje(data) {
  const container = document.getElementById('dashboard-horarios-hoje');
  if (!container) return;

  const diaSemana = new Date().getDay();

  if (diaSemana === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:20px;">
        <i class="fas fa-sun" style="font-size:2.5rem;"></i>
        <p style="font-size:1.1rem;margin:10px 0;">Domingo é dia de descanso! 🛌</p>
        <small style="color:var(--ios-text-secondary);">Amanhã (segunda) você tem aulas normalmente.</small>
      </div>`;
    return;
  }
  if (diaSemana === 6) {
    container.innerHTML = `
      <div class="empty-state" style="padding:20px;">
        <i class="fas fa-couch" style="font-size:2.5rem;"></i>
        <p style="font-size:1.1rem;margin:10px 0;">Sábado, dia de relaxar! 🎉</p>
        <small style="color:var(--ios-text-secondary);">Aproveite o fim de semana.</small>
      </div>`;
    return;
  }

  const turmas = safeArray(data.turmas);
  const horariosHoje = [];

  turmas.forEach(t => {
    if (t.horarios_de_aula) {
      t.horarios_de_aula.split(' / ').forEach(cod => {
        const p = parseHorario(cod.trim());
        if (p && p.dia === diaSemana + 1) {
          horariosHoje.push({
            ...p,
            disciplina: t.descricao,
            sigla: t.sigla,
            local: t.locais_de_aula?.[0] || 'Local não definido',
          });
        }
      });
    }
  });

  if (horariosHoje.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:20px;"><i class="fas fa-calendar-day"></i><p>Nenhuma aula hoje</p></div>`;
    return;
  }

  const ordemTurno = { M: 1, V: 2, N: 3 };
  horariosHoje.sort((a, b) => {
    if (ordemTurno[a.turno] !== ordemTurno[b.turno]) return ordemTurno[a.turno] - ordemTurno[b.turno];
    return a.horas[0] - b.horas[0];
  });

  let html = '<div style="display:flex;flex-direction:column;gap:12px;">';
  horariosHoje.forEach(aula => {
    const tagClass = { M: 'tag-manha', V: 'tag-tarde', N: 'tag-noite' }[aula.turno] || 'tag-manha';
    html += `
      <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.03);padding:16px;border-radius:16px;border-left:4px solid var(--ios-accent-green);">
        <div>
          <div style="font-weight:600;margin-bottom:4px;">${aula.disciplina}</div>
          <div style="font-size:.85rem;color:var(--ios-text-secondary);"><i class="fas fa-map-marker-alt"></i> ${aula.local}</div>
        </div>
        <span class="aula-tag ${tagClass}" style="font-size:.7rem;">${aula.turnoNome} (${aula.horasStr})</span>
      </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function preencherPerfil(data) {
  const aluno = safeObject(data.aluno);
  const nome = aluno.nome_usual || aluno.nome || 'Aluno';
  const foto = aluno.foto || aluno.url_foto_75x100;

  const nomeEl = document.getElementById('perfil-nome');
  const matEl = document.getElementById('perfil-matricula');
  const emailEl = document.getElementById('perfil-email');
  if (nomeEl) nomeEl.textContent = nome;
  if (matEl) matEl.textContent = aluno.identificacao || '--';
  if (emailEl) emailEl.textContent = aluno.email_academico || aluno.email || '--';

  const avatarEl = document.getElementById('perfil-avatar');
  if (avatarEl) {
    if (foto) {
      avatarEl.innerHTML = `<img src="${foto}" alt="Foto" onerror="this.parentElement.innerHTML='<span>${nome.charAt(0)}</span>'">`;
    } else {
      avatarEl.innerHTML = `<span>${nome.charAt(0).toUpperCase()}</span>`;
    }
  }

  const detalhesEl = document.getElementById('perfil-detalhes');
  if (detalhesEl) {
    const campos = [
      { label: 'Nome Completo',   value: aluno.nome || aluno.nome_registro },
      { label: 'Nome Usual',      value: aluno.nome_usual },
      { label: 'Matrícula',       value: aluno.matricula },
      { label: 'CPF',             value: aluno.cpf },
      { label: 'E-mail Acadêmico',value: aluno.email_academico },
      { label: 'Curso',           value: aluno.curso },
      { label: 'Campus',          value: aluno.campus },
      { label: 'Situação',        value: aluno.situacao },
      { label: 'IRA',             value: aluno.ira },
      { label: 'Ano de Ingresso', value: aluno.ingresso || aluno.ano_ingresso },
      { label: 'Ano Atual',       value: aluno.ano_atual },
    ];
    detalhesEl.innerHTML = campos.filter(c => c.value).map(c => `
      <div class="info-row">
        <span class="info-label" style="font-size:.875rem;">${c.label}</span>
        <span class="info-value" style="font-size:.875rem;">${c.value}</span>
      </div>`).join('');
  }
}

function preencherPeriodos(data) {
  const periodos = safeArray(data.periodos);
  const container = document.getElementById('periodos-grid');
  const anos = [...new Set(periodos.map(p => p.ano_letivo))].sort((a, b) => b - a);

  const headerSelect = document.getElementById('ano-select');
  if (headerSelect) {
    headerSelect.innerHTML = anos.map(a =>
      `<option value="${a}" ${a === anoAtual ? 'selected' : ''}>${a}</option>`).join('');
  }

  if (container) {
    if (anos.length === 0) {
      container.innerHTML = '<p style="color:var(--ios-text-secondary);text-align:center;padding:40px;">Nenhum período encontrado</p>';
    } else {
      container.innerHTML = anos.map(ano => `
        <div class="periodo-card ${ano === anoAtual ? 'active' : ''}" onclick="trocarAno(${ano})">
          <div class="periodo-ano">${ano}</div>
          <div class="periodo-status">${ano === anoAtual ? 'Período Atual' : 'Clique para visualizar'}</div>
        </div>`).join('');
    }
  }
}

function preencherBoletim(data) {
  const boletim = safeArray(data.boletim);
  const container = document.getElementById('boletim-content');
  if (!container) return;

  if (boletim.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-file-alt"></i><p>Nenhuma disciplina encontrada</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="ios-table">
        <thead>
          <tr>
            <th>Disciplina</th>
            <th style="text-align:center;">1ª Etapa</th>
            <th style="text-align:center;">2ª Etapa</th>
            <th style="text-align:center;">3ª Etapa</th>
            <th style="text-align:center;">4ª Etapa</th>
            <th style="text-align:center;">Média</th>
            <th style="text-align:center;">Situação</th>
          </tr>
        </thead>
        <tbody>
          ${boletim.map(d => {
            const n1 = d.nota_etapa_1?.nota || '--';
            const n2 = d.nota_etapa_2?.nota || '--';
            const n3 = d.nota_etapa_3?.nota || '--';
            const n4 = d.nota_etapa_4?.nota || '--';
            const media = d.media_disciplina || d.media_final_disciplina || '--';
            const n1n = parseFloat(n1) || 0, n2n = parseFloat(n2) || 0;
            const n3n = parseFloat(n3) || 0, n4n = parseFloat(n4) || 0;
            const cls = i => i >= 60 ? 'nota-aprovado' : i >= 40 ? 'nota-recuperacao' : 'nota-reprovado';
            let sitCls = 'tag-cursando';
            if (d.situacao === 'Aprovado') sitCls = 'tag-aprovado';
            else if (d.situacao === 'Reprovado') sitCls = 'tag-reprovado';
            return `
              <tr>
                <td>
                  <div class="disciplina-info">
                    <h4>${d.disciplina || 'Disciplina'}</h4>
                    <p>Faltas: ${d.numero_faltas || 0} | Freq: ${d.percentual_carga_horaria_frequentada || 0}%</p>
                  </div>
                </td>
                <td style="text-align:center;"><span class="nota-badge ${cls(n1n)}">${n1}</span></td>
                <td style="text-align:center;"><span class="nota-badge ${cls(n2n)}">${n2}</span></td>
                <td style="text-align:center;"><span class="nota-badge ${cls(n3n)}">${n3}</span></td>
                <td style="text-align:center;"><span class="nota-badge ${cls(n4n)}">${n4}</span></td>
                <td style="text-align:center;font-weight:700;font-size:1.1rem;">${media}</td>
                <td style="text-align:center;"><span class="situacao-badge ${sitCls}">${d.situacao || 'Cursando'}</span></td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function preencherHorarios(data) {
  const turmas = safeArray(data.turmas);
  const container = document.getElementById('horarios-content');
  if (!container) return;

  const horariosParseados = [];
  turmas.forEach(t => {
    if (t.horarios_de_aula) {
      t.horarios_de_aula.split(' / ').forEach(cod => {
        const p = parseHorario(cod.trim());
        if (p) {
          horariosParseados.push({
            ...p,
            disciplina: t.descricao,
            sigla: t.sigla,
            local: t.locais_de_aula?.[0] || 'Local não definido',
          });
        }
      });
    }
  });

  if (horariosParseados.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-clock"></i><p>Nenhum horário encontrado</p></div>`;
    return;
  }

  const diasSemana = { 2: 'Segunda-feira', 3: 'Terça-feira', 4: 'Quarta-feira', 5: 'Quinta-feira', 6: 'Sexta-feira' };
  let html = '<div>';

  [2, 3, 4, 5, 6].forEach(dia => {
    const aulasDia = horariosParseados.filter(h => h.dia === dia);
    if (aulasDia.length > 0) {
      html += `<div class="dia-card"><div class="dia-header"><i class="fas fa-calendar-day"></i> ${diasSemana[dia]}</div>`;

      const ordemTurno = { M: 1, V: 2, N: 3 };
      aulasDia.sort((a, b) => {
        if (ordemTurno[a.turno] !== ordemTurno[b.turno]) return ordemTurno[a.turno] - ordemTurno[b.turno];
        return a.horas[0] - b.horas[0];
      });

      aulasDia.forEach(aula => {
        const tagClass = { M: 'tag-manha', V: 'tag-tarde', N: 'tag-noite' }[aula.turno] || 'tag-manha';
        html += `
          <div class="aula-card">
            <div class="aula-info">
              <h4>${aula.disciplina}</h4>
              <p><i class="fas fa-map-marker-alt"></i> ${aula.local.split(' - ')[0]}</p>
            </div>
            <div style="text-align:right;">
              <span class="aula-tag ${tagClass}">${aula.turnoNome}</span>
              <div style="margin-top:6px;font-size:.85rem;color:var(--ios-text-secondary);font-weight:600;">${aula.horasStr} aula</div>
            </div>
          </div>`;
      });

      html += '</div>';
    }
  });

  html += '</div>';
  container.innerHTML = html;
}

function preencherTurmas(data) {
  const turmas = safeArray(data.turmas);
  const container = document.getElementById('turmas-content');
  if (!container) return;

  if (turmas.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><p>Nenhuma turma encontrada</p></div>`;
    return;
  }

  container.innerHTML = turmas.map(t => {
    const horariosHtml = t.horarios_de_aula
      ? t.horarios_de_aula.split(' / ').map(h => {
          const p = parseHorario(h.trim());
          return p
            ? `<span style="background:rgba(48,209,88,.15);color:var(--ios-accent-green);padding:4px 12px;border-radius:8px;font-size:.75rem;margin-right:6px;border:1px solid rgba(48,209,88,.3);font-weight:600;">${p.diaNome} - ${p.turnoNome}</span>`
            : '';
        }).join('')
      : '';

    return `
      <div class="turma-item">
        <span class="turma-badge">${t.sigla || '---'}</span>
        <div class="turma-nome">${t.descricao || 'Disciplina'}</div>
        ${t.observacao ? `<div style="font-size:.9rem;color:var(--ios-accent-orange);margin-bottom:12px;"><i class="fas fa-info-circle"></i> ${t.observacao}</div>` : ''}
        <div style="margin-bottom:12px;">${horariosHtml}</div>
        <div class="turma-meta">
          <span><i class="fas fa-map-marker-alt"></i> ${t.locais_de_aula?.[0]?.split(' - ')[0] || 'Local não definido'}</span>
        </div>
      </div>`;
  }).join('');
}

function preencherAvaliacoes(data) {
  // Próximas
  const containerProximas = document.getElementById('avaliacoes-content');
  if (containerProximas) {
    const proximas = data.avaliacoes ? safeArray(data.avaliacoes.proximas) : [];

    if (proximas.length === 0) {
      containerProximas.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-calendar-check"></i>
          <p>Nenhuma avaliação agendada</p>
          <small>As avaliações aparecerão aqui quando forem marcadas</small>
        </div>`;
    } else {
      containerProximas.innerHTML = proximas.map(av => `
        <div class="timeline-item" style="margin-bottom:16px;padding:20px;background:rgba(255,255,255,.03);border-radius:16px;border:1px solid var(--glass-border);">
          <div class="timeline-date" style="color:var(--ios-accent-green);font-weight:600;margin-bottom:8px;">
            <i class="fas fa-clock"></i> ${formatarData(av.data)} ${av.hora_inicio ? `às ${av.hora_inicio}` : ''}
          </div>
          <div class="timeline-title" style="font-size:1.1rem;font-weight:600;margin-bottom:4px;">
            ${av.descricao || av.tipo || 'Avaliação'}
          </div>
          <div class="timeline-desc" style="color:var(--ios-text-secondary);">
            ${av.componente_curricular || av.diario || 'Disciplina não informada'}
          </div>
          ${av.nota_maxima ? `<div style="margin-top:8px;font-size:.9rem;color:var(--ios-accent-orange);"><i class="fas fa-star"></i> Valor máximo: ${av.nota_maxima}</div>` : ''}
        </div>`).join('');
    }
  }

  // Histórico
  const containerHistorico = document.getElementById('avaliacoes-historico-content');
  if (containerHistorico && data.avaliacoes?.historico) {
    const historico = safeArray(data.avaliacoes.historico);

    historico.sort((a, b) => {
      if (a.etapa !== b.etapa) return a.etapa - b.etapa;
      return (a.disciplina || '').localeCompare(b.disciplina || '');
    });

    const porEtapa = {};
    historico.forEach(av => {
      if (!porEtapa[av.etapa]) porEtapa[av.etapa] = [];
      porEtapa[av.etapa].push(av);
    });

    if (historico.length === 0) {
      containerHistorico.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-history"></i>
          <p>Nenhuma avaliação no histórico</p>
        </div>`;
    } else {
      let html = '';
      [1, 2, 3, 4].forEach(etapa => {
        if (porEtapa[etapa]) {
          html += `
            <div style="margin-bottom:24px;">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--glass-border);">
                <span style="background:var(--gradient-primary);padding:6px 14px;border-radius:20px;font-size:.85rem;font-weight:700;">
                  ${etapa}ª Etapa
                </span>
                <span style="color:var(--ios-text-secondary);font-size:.9rem;">
                  ${porEtapa[etapa].length} avaliação(ões)
                </span>
              </div>
              <div style="display:flex;flex-direction:column;gap:10px;">
                ${porEtapa[etapa].map(av => `
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:16px;background:rgba(255,255,255,.03);border-radius:12px;border:1px solid var(--glass-border);">
                    <div style="flex:1;">
                      <div style="font-weight:600;font-size:1rem;margin-bottom:4px;">${av.disciplina}</div>
                      <div style="font-size:.8rem;color:var(--ios-text-secondary);">${av.codigo_diario || ''}</div>
                    </div>
                    <div style="text-align:right;margin-left:16px;">
                      <span class="nota-badge ${parseFloat(av.nota) >= 60 ? 'nota-aprovado' : parseFloat(av.nota) >= 40 ? 'nota-recuperacao' : 'nota-reprovado'}" style="font-size:1.1rem;padding:8px 16px;">
                        ${av.nota !== null && av.nota !== undefined ? av.nota : '-'}
                      </span>
                    </div>
                  </div>`).join('')}
              </div>
            </div>`;
        }
      });
      containerHistorico.innerHTML = html;
    }
  }
}

function mudarPeriodoBoletim() {}

// ============================================================================
// NOTIFICAÇÕES FCM
// ============================================================================
function showToast(message, duration = 3000) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fas fa-info-circle"></i><span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

async function initNotifications() {
  try {
    const { messaging, getToken, onMessage } = await import('./firebase-init.js');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { showToast('⚠️ Permissão negada'); return; }

    const vapidKey = 'BOamnGvNvE8HipXDCIasCWMlIzI1sWS1ONqG8ZXp0RUwsyJuxT1zjSB2vKaLHwVP45Bhl5SWoJKlraRNTvbAH_o';
    const token = await getToken(messaging, { vapidKey });
    if (!token) { showToast('❌ Erro ao obter token'); return; }

    const suapToken = localStorage.getItem('suap_token');
    const response = await fetch(cfg.api.notifications('subscribe'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${suapToken}`,
      },
      body: JSON.stringify({ fcmToken: token, token: suapToken }),
    });

    if (!response.ok) throw new Error('Erro ao registrar no servidor');

    showToast('🔔 Notificações ativadas!');
    updateNotificationUI(true);

    onMessage(messaging, (payload) => {
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: payload.notification.icon || '/assets/icons/SIMPLIF - Icon Sem Fundo 192x192.png',
      });
    });
  } catch (err) {
    console.error('❌ Erro Firebase:', err);
    showToast('❌ Erro: ' + err.message);
  }
}

async function checkNotificationStatus() {
  try {
    const { messaging, getToken } = await import('./firebase-init.js');
    if (Notification.permission !== 'granted') { updateNotificationUI(false); return; }
    const token = await getToken(messaging);
    updateNotificationUI(!!token);
  } catch {
    updateNotificationUI(false);
  }
}

async function unsubscribeNotifications() {
  try {
    const { messaging } = await import('./firebase-init.js');
    await messaging.deleteToken();

    const token = localStorage.getItem('suap_token');
    await fetch(cfg.api.notifications('unsubscribe'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ token }),
    });

    showToast('🔕 Notificações desativadas');
    updateNotificationUI(false);
  } catch (err) {
    console.error('Erro:', err);
  }
}

function updateNotificationUI(isActive) {
  const btn = document.getElementById('notification-btn');
  if (!btn) return;
  if (isActive) {
    btn.innerHTML = '<i class="fas fa-bell"></i><span>Notificações Ativas</span>';
    btn.classList.add('active');
    btn.onclick = unsubscribeNotifications;
  } else {
    btn.innerHTML = '<i class="fas fa-bell-slash"></i><span>Ativar Notificações</span>';
    btn.classList.remove('active');
    btn.onclick = initNotifications;
  }
}

// Bloqueio de long-press / drag em telas pequenas
if (window.innerWidth <= 1024) {
  window.addEventListener('contextmenu', e => e.preventDefault(), false);
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('dragstart', e => e.preventDefault());
    img.addEventListener('mousedown', e => e.preventDefault());
  });
}

// ============================================================================
// BOOT
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Inicializando aplicação...');

  // Mapa e dados do SUAP são independentes → roda em paralelo
  await Promise.all([
    carregarDadosMapa(),
    carregarDados(),
  ]);

  initializeFuse();
  setTimeout(checkNotificationStatus, 1000);

  // Expõe funções usadas em `onclick=` no HTML
  Object.assign(window, {
    performSmartSearch, handleSearchInput, selectRoom, selectBuilding,
    zoomMap, resetMap, showSection, toggleSidebar, closeSidebar, logout,
    trocarAno, initNotifications, unsubscribeNotifications,
    clearSearch, closeResultPanel, filterByCategory,
    toggleSidebarDesktop,
    openThemePicker, closeThemePicker, selectTheme, applyTheme,
    openSpotlight, closeSpotlight, updateSpotlightSearch, executeSpotlightItem,
    handleSpotlightKeydown,
  });

  console.log('✅ Sistema pronto!');
});