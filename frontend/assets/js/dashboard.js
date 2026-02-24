// dashboard.js - Versão SIMPLIFICADA e FUNCIONAL

const API_URL = 'https://if-hub-backend.onrender.com/api';
let dadosGlobais = null;
let dadosAluno = null;
let anoAtual = new Date().getFullYear();

// Database de salas do Campus Santa Cruz
const roomsDatabase = [
    // Bloco A
    { id: 'biblioteca', name: 'Biblioteca Central', block: 'A', floor: 'Térreo', room: 'A-101', type: 'biblioteca', keywords: ['biblioteca', 'livros', 'estudo', 'bibli'] },
    { id: 'sec-academica', name: 'Secretaria Acadêmica', block: 'A', floor: 'Térreo', room: 'A-102', type: 'administrativo', keywords: ['secretaria', 'matrícula', 'secret'] },
    { id: 'direcao', name: 'Direção/Gabinete', block: 'A', floor: '1º Andar', room: 'A-201', type: 'administrativo', keywords: ['direção', 'diretor', 'gabinete'] },
    { id: 'sala-prof', name: 'Sala dos Professores', block: 'A', floor: '1º Andar', room: 'A-202', type: 'administrativo', keywords: ['professores', 'docentes'] },
    { id: 'saude', name: 'Posto de Saúde', block: 'A', floor: 'Térreo', room: 'A-103', type: 'saúde', keywords: ['saúde', 'enfermaria', 'médico'] },
    
    // Bloco B
    { id: 'lab-info-1', name: 'Laboratório de Informática 1', block: 'B', floor: 'Térreo', room: 'B-105', type: 'laboratório', keywords: ['lab', 'informática', 'computador', 'info'] },
    { id: 'lab-info-2', name: 'Laboratório de Informática 2', block: 'B', floor: 'Térreo', room: 'B-106', type: 'laboratório', keywords: ['lab', 'informática'] },
    { id: 'sala-201', name: 'Sala de Aula 201', block: 'B', floor: '2º Andar', room: 'B-301', type: 'sala', keywords: ['sala', 'aula', '201'] },
    { id: 'sala-101', name: 'Sala de Aula 101', block: 'B', floor: '1º Andar', room: 'B-201', type: 'sala', keywords: ['101', 'sala 101'] },
    
    // Bloco C
    { id: 'lab-quimica', name: 'Laboratório de Química', block: 'C', floor: 'Térreo', room: 'C-101', type: 'laboratório', keywords: ['química', 'lab', 'quimica'] },
    { id: 'lab-fisica', name: 'Laboratório de Física', block: 'C', floor: 'Térreo', room: 'C-102', type: 'laboratório', keywords: ['física', 'lab', 'fisica'] },
    { id: 'auditorio', name: 'Auditório Central', block: 'C', floor: '2º Andar', room: 'C-401', type: 'auditório', keywords: ['auditório', 'eventos', 'palestras'] },
    
    // Bloco D
    { id: 'lab-eletrica', name: 'Laboratório de Eletricidade', block: 'D', floor: 'Térreo', room: 'D-110', type: 'laboratório', keywords: ['elétrica', 'eletricidade'] },
    { id: 'lab-mecanica', name: 'Laboratório de Mecânica', block: 'D', floor: 'Térreo', room: 'D-111', type: 'laboratório', keywords: ['mecânica', 'mecanica'] },
    
    // Bloco F
    { id: 'cantina', name: 'Cantina/Restaurante', block: 'F', floor: 'Térreo', room: 'F-001', type: 'alimentação', keywords: ['cantina', 'restaurante', 'comida', 'lanche'] },
    { id: 'biblioteca-setorial', name: 'Biblioteca Setorial', block: 'F', floor: '1º Andar', room: 'F-101', type: 'biblioteca', keywords: ['biblioteca', 'livros', 'setorial'] },
    
    // Áreas Externas
    { id: 'quadra', name: 'Quadra Poliesportiva', block: 'Externo', floor: '-', room: 'Quadra', type: 'esporte', keywords: ['quadra', 'esporte', 'futsal', 'basquete'] },
    { id: 'areia', name: 'Quadra de Areia', block: 'Externo', floor: '-', room: 'Areia', type: 'esporte', keywords: ['areia', 'vôlei', 'futevôlei'] }
];

// Dados dos blocos
const buildingData = {
    'B': {
        nome: 'Bloco B',
        descricao: 'Salas de Aula e Centro de Convivência',
        andares: {
            'Térreo': ['Centro de Convivência', 'Espaço Cultural'],
            '1º Andar': ['Salas de Professores'],
            '2º Andar': ['Salas de Aula 201-205']
        },
        icon: 'building',
        cor: 'var(--ios-accent-green)'
    },
    'A': {
        nome: 'Bloco A',
        descricao: 'Administração e Laboratórios',
        andares: {
            'Térreo': ['Secretaria', 'Biblioteca'],
            '1º Andar': ['Direção', 'Sala dos Professores'],
            '2º Andar': ['Coordenações']
        },
        icon: 'flask',
        cor: 'var(--ios-accent-purple)'
    },
    '5': {
        nome: 'Bloco 5',
        descricao: 'Mecânica e Refrigeração',
        andares: {
            'Térreo': ['Oficina Mecânica'],
            '1º Andar': ['Lab. Refrigeração']
        },
        icon: 'cogs',
        cor: 'var(--ios-accent-purple)'
    },
    '1': {
        nome: 'Guarita',
        descricao: 'Entrada principal',
        andares: { 'Térreo': ['Portaria'] },
        icon: 'shield-alt',
        cor: 'var(--ios-accent-blue)'
    },
    '2': {
        nome: 'Cantina',
        descricao: 'Alimentação',
        andares: { 'Térreo': ['Cantina', 'Restaurante'] },
        icon: 'utensils',
        cor: 'var(--ios-accent-yellow)'
    },
    '3': {
        nome: 'Almoxarifado',
        descricao: 'Armazenamento',
        andares: { 'Térreo': ['Almoxarifado'] },
        icon: 'boxes',
        cor: 'var(--ios-accent-blue)'
    },
    'areia': {
        nome: 'Quadra de Areia',
        descricao: 'Esportes de praia',
        andares: { 'Externo': ['Vôlei de Praia'] },
        icon: 'volleyball-ball',
        cor: 'var(--ios-accent-orange)'
    },
    '4': {
        nome: 'Espaço Multiuso',
        descricao: 'Atividades diversas',
        andares: { 'Térreo': ['Ginástica'] },
        icon: 'table-tennis',
        cor: 'var(--ios-accent-orange)'
    },
    'quadra': {
        nome: 'Quadra Poliesportiva',
        descricao: 'Esportes',
        andares: { 'Externo': ['Basquete', 'Futsal'] },
        icon: 'basketball-ball',
        cor: 'var(--ios-accent-orange)'
    },
    '6': {
        nome: 'Piscina',
        descricao: 'Natação',
        andares: { 'Externo': ['Piscina'] },
        icon: 'swimming-pool',
        cor: 'var(--ios-accent-blue)'
    }
};

// ========== VARIÁVEIS GLOBAIS ==========
let fuseRooms, fuseBuildings;
let currentZoom = 1;
let searchTimeout = null;

// ========== FUNÇÕES DE BUSCA ==========

// Inicializa o Fuse.js
function initializeFuse() {
    console.log('Inicializando busca inteligente...');
    
    const fuseOptions = {
        includeScore: true,
        threshold: 0.4,
        ignoreLocation: true,
        findAllMatches: true,
        minMatchCharLength: 2,
        keys: [
            { name: 'name', weight: 2 },
            { name: 'keywords', weight: 1.5 },
            { name: 'room', weight: 1 },
            { name: 'block', weight: 1 }
        ]
    };

    fuseRooms = new Fuse(roomsDatabase, fuseOptions);
    
    const buildingArray = Object.entries(buildingData).map(([id, data]) => ({
        id: id,
        nome: data.nome,
        descricao: data.descricao,
        icon: data.icon,
        cor: data.cor,
        andares: data.andares
    }));
    
    fuseBuildings = new Fuse(buildingArray, {
        includeScore: true,
        threshold: 0.4,
        keys: ['nome', 'descricao']
    });
    
    console.log('Busca inteligente pronta!');
}

// FUNÇÃO PRINCIPAL DE BUSCA (chamada pelo HTML)
function performSmartSearch() {
    console.log('Buscando...');
    const input = document.getElementById('room-search');
    if (!input) return;
    
    const query = input.value.trim();
    
    if (!query || query.length < 2) {
        document.getElementById('autocomplete-suggestions').classList.remove('show');
        return;
    }

    if (!fuseRooms) initializeFuse();

    // Busca salas e blocos
    const roomResults = fuseRooms.search(query);
    const buildingResults = fuseBuildings.search(query);

    // Combina resultados
    const allResults = [
        ...roomResults.map(r => ({ item: r.item, score: r.score, type: 'room' })),
        ...buildingResults.map(b => ({ item: b.item, score: b.score, type: 'building' }))
    ].sort((a, b) => (a.score || 1) - (b.score || 1)).slice(0, 8);

    showSuggestions(allResults, query);
}

// Mostra sugestões
function showSuggestions(results, query) {
    const container = document.getElementById('autocomplete-suggestions');
    if (!container) return;
    
    if (results.length === 0) {
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--ios-text-secondary);">
                <i class="fas fa-search" style="font-size: 2rem; opacity: 0.5; margin-bottom: 10px;"></i>
                <p>Nenhum resultado para "${escapeHtml(query)}"</p>
                <small>Tente: bibli, lab, 101, cantina...</small>
            </div>
        `;
        container.classList.add('show');
        return;
    }

    let html = '';
    
    results.forEach(result => {
        if (result.type === 'room') {
            const room = result.item;
            html += `
                <div class="suggestion-item" onclick="selectRoom('${room.id}')">
                    <i class="fas fa-door-open" style="color: var(--ios-accent-green); width: 30px;"></i>
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${highlightMatch(room.name, query)}</div>
                        <div style="font-size: 0.8rem; color: var(--ios-text-secondary);">
                            Bloco ${room.block} • ${room.room}
                        </div>
                    </div>
                </div>
            `;
        } else {
            const building = result.item;
            html += `
                <div class="suggestion-item" onclick="selectBuilding('${building.id}')">
                    <i class="fas fa-building" style="color: var(--ios-accent-blue); width: 30px;"></i>
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${highlightMatch(building.nome, query)}</div>
                        <div style="font-size: 0.8rem; color: var(--ios-text-secondary);">
                            ${building.descricao.substring(0, 40)}...
                        </div>
                    </div>
                </div>
            `;
        }
    });

    container.innerHTML = html;
    container.classList.add('show');
}

// FUNÇÃO CHAMADA PELO oninput
function handleSearchInput() {
    const input = document.getElementById('room-search');
    if (!input) return;
    
    const query = input.value;
    
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    if (query.length >= 2) {
        searchTimeout = setTimeout(() => {
            performSmartSearch();
        }, 300);
    } else {
        document.getElementById('autocomplete-suggestions').classList.remove('show');
    }
}

// Seleciona uma sala
function selectRoom(roomId) {
    const room = roomsDatabase.find(r => r.id === roomId);
    if (!room) return;
    
    document.getElementById('autocomplete-suggestions').classList.remove('show');
    document.getElementById('room-search').value = room.name;
    
    showRoomDetails(room);
    highlightBuilding(room.block);
}

// Seleciona um bloco
function selectBuilding(buildingId) {
    const building = buildingData[buildingId];
    if (!building) return;
    
    document.getElementById('autocomplete-suggestions').classList.remove('show');
    document.getElementById('room-search').value = building.nome;
    
    showBuildingDetails(buildingId, building);
    highlightBuilding(buildingId);
}

// Mostra detalhes da sala
function showRoomDetails(room) {
    const container = document.getElementById('search-result-container');
    const title = document.getElementById('search-result-title');
    const content = document.getElementById('search-result-content');
    
    if (!container) return;
    
    title.innerHTML = `
        <i class="fas fa-door-open" style="color: var(--ios-accent-green);"></i>
        <span>${room.name}</span>
        <span style="background: var(--gradient-primary); padding: 4px 12px; border-radius: 20px; font-size: 0.8rem;">Bloco ${room.block}</span>
    `;

    content.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px;">
                <i class="fas fa-door-closed"></i>
                <div><strong>Sala</strong><br>${room.room}</div>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px;">
                <i class="fas fa-building"></i>
                <div><strong>Bloco</strong><br>${room.block}</div>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px;">
                <i class="fas fa-layer-group"></i>
                <div><strong>Andar</strong><br>${room.floor}</div>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px;">
                <i class="fas fa-tag"></i>
                <div><strong>Tipo</strong><br>${room.type}</div>
            </div>
        </div>
    `;

    container.style.display = 'block';
    container.classList.add('show');
}

// Mostra detalhes do bloco
function showBuildingDetails(buildingId, building) {
    const container = document.getElementById('search-result-container');
    const title = document.getElementById('search-result-title');
    const content = document.getElementById('search-result-content');
    
    if (!container) return;
    
    title.innerHTML = `
        <i class="fas fa-${building.icon}" style="color: ${building.cor};"></i>
        <span>${building.nome}</span>
    `;

    let andaresHtml = '';
    for (const [andar, salas] of Object.entries(building.andares)) {
        andaresHtml += `
            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; margin-bottom: 10px;">
                <div style="font-weight: 600; color: var(--ios-accent-green); margin-bottom: 5px;">${andar}</div>
                <div style="color: var(--ios-text-secondary);">${salas.join(' • ')}</div>
            </div>
        `;
    }

    content.innerHTML = `
        <p style="color: var(--ios-text-secondary); margin-bottom: 20px;">${building.descricao}</p>
        <h4 style="margin-bottom: 15px;">Andares</h4>
        ${andaresHtml}
    `;

    container.style.display = 'block';
    container.classList.add('show');
}

// Destaca bloco no mapa
function highlightBuilding(buildingId) {
    document.querySelectorAll('.building-3d').forEach(b => b.classList.remove('active', 'highlight'));
    
    const building = document.querySelector(`[data-id="${buildingId}"]`);
    if (building) {
        building.classList.add('active', 'highlight');
    }
}

// Funções de zoom
function zoomMap(factor) {
    currentZoom *= factor;
    currentZoom = Math.max(0.5, Math.min(3, currentZoom));
    const image = document.getElementById('campus-image');
    if (image) {
        image.style.transform = `scale(${currentZoom})`;
    }
}

function resetMap() {
    currentZoom = 1;
    const image = document.getElementById('campus-image');
    if (image) image.style.transform = 'scale(1)';
    
    document.querySelectorAll('.building-3d').forEach(b => b.classList.remove('active', 'highlight'));
    
    const container = document.getElementById('search-result-container');
    if (container) {
        container.style.display = 'none';
        container.classList.remove('show');
    }
    
    const input = document.getElementById('room-search');
    if (input) input.value = '';
    
    document.getElementById('autocomplete-suggestions').classList.remove('show');
}

// Utilitários
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    try {
        const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
        return escapeHtml(text).replace(regex, '<mark style="background: rgba(48,209,88,0.3); padding: 2px; border-radius: 3px;">$1</mark>');
    } catch (e) {
        return escapeHtml(text);
    }
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ========== FUNÇÕES ORIGINAIS (mantidas) ==========

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
    const turnosNomes = { 'M': 'Manhã', 'V': 'Tarde', 'N': 'Noite' };
    
    return {
        dia,
        diaNome: diasNomes[dia] || '',
        turno,
        turnoNome: turnosNomes[turno] || turno,
        horas,
        horasStr: horas.join('ª, ') + 'ª'
    };
}

// Navegação
function showSection(sectionName, event) {
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    } else {
        const activeLink = Array.from(document.querySelectorAll('.nav-link')).find(link =>
            link.getAttribute('onclick') && link.getAttribute('onclick').includes(sectionName)
        );
        if (activeLink) activeLink.classList.add('active');
    }

    document.querySelectorAll('.mobile-menu-item').forEach(item => item.classList.remove('active'));
    const mobileItem = Array.from(document.querySelectorAll('.mobile-menu-item')).find(item =>
        item.getAttribute('onclick') && item.getAttribute('onclick').includes(sectionName)
    );
    if (mobileItem) mobileItem.classList.add('active');

    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    const titles = {
        'dashboard': '<i class="fas fa-home"></i> Dashboard',
        'boletim': '<i class="fas fa-file-alt"></i> Boletim',
        'horarios': '<i class="fas fa-clock"></i> Horários',
        'turmas': '<i class="fas fa-users"></i> Turmas',
        'mapa': '<i class="fas fa-map-marked-alt"></i> Mapa do Campus',
        'avaliacoes': '<i class="fas fa-clipboard-list"></i> Avaliações',
        'periodos': '<i class="fas fa-calendar-alt"></i> Períodos',
        'perfil': '<i class="fas fa-user"></i> Perfil'
    };
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.innerHTML = titles[sectionName] || titles['dashboard'];
    }

    if (window.innerWidth <= 1024) {
        closeSidebar();
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const icon = document.getElementById('menu-toggle-icon');

    sidebar.classList.toggle('open');
    if (sidebar.classList.contains('open')) {
        overlay.style.display = 'block';
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-arrow-left');
    } else {
        overlay.style.display = 'none';
        icon.classList.remove('fa-arrow-left');
        icon.classList.add('fa-bars');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const icon = document.getElementById('menu-toggle-icon');

    sidebar.classList.remove('open');
    overlay.style.display = 'none';
    icon.classList.remove('fa-arrow-left');
    icon.classList.add('fa-bars');
}

async function logout() {
    try {
        await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {}
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
            <span style="font-weight: 500;">${message}</span>
        </div>
    `;
    setTimeout(() => container.innerHTML = '', 5000);
}

function mostrarLoading() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'flex';
}

function esconderLoading() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'none';
}

async function trocarAno(novoAno) {
    anoAtual = parseInt(novoAno);
    mostrarLoading();
    await carregarDadosAno(anoAtual);
    esconderLoading();
}

async function carregarDadosAluno() {
    const token = localStorage.getItem('suap_token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
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
    const token = localStorage.getItem('suap_token');
    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/dashboard/${ano}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            localStorage.removeItem('suap_token');
            showAlert('Sessão expirada. Faça login novamente.');
            setTimeout(() => window.location.href = '/index.html', 2000);
            return;
        }

        const data = await response.json();
        
        dadosGlobais = {
            ...data,
            aluno: dadosAluno
        };
        
        if (data.erro) {
            showAlert(data.erro);
            return;
        }

        preencherDashboard(dadosGlobais);
        preencherPeriodos(dadosGlobais);
        preencherAvaliacoes(dadosGlobais);
        preencherBoletim(dadosGlobais);
        preencherHorarios(dadosGlobais);
        preencherTurmas(dadosGlobais);

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

function preencherSidebar(data) {
    const aluno = safeObject(data.aluno);
    const nome = aluno.nome_usual || aluno.nome || 'Aluno';
    const matricula = aluno.matricula || '';
    const foto = aluno.foto || aluno.url_foto_75x100;

    const nomeEl = document.getElementById('sidebar-nome');
    const matriculaEl = document.getElementById('sidebar-matricula');
    
    if (nomeEl) nomeEl.textContent = nome;
    if (matriculaEl) matriculaEl.textContent = matricula;
    
    const avatarEl = document.getElementById('sidebar-avatar');
    if (avatarEl) {
        if (foto) {
            avatarEl.innerHTML = `<img src="${foto}" alt="Foto" onerror="this.style.display='none'; this.parentElement.innerHTML='<span>${nome.charAt(0)}</span>'">`;
        } else {
            avatarEl.innerHTML = `<span>${nome.charAt(0).toUpperCase()}</span>`;
        }
    }
}

function preencherDashboard(data) {
    const aluno = safeObject(data.aluno);
    
    const cardIra = document.getElementById('card-ira');
    const cardSituacao = document.getElementById('card-situacao');
    const cardCurso = document.getElementById('card-curso');
    const cardIngresso = document.getElementById('card-ingresso');
    const cardFaltas = document.getElementById('card-faltas');
    const cardDisciplinas = document.getElementById('card-disciplinas');

    if (cardIra) cardIra.textContent = aluno.ira || '--';
    if (cardSituacao) cardSituacao.textContent = aluno.situacao || '--';
    if (cardCurso) cardCurso.textContent = (aluno.curso || '').split(' - ')[1] || aluno.curso || '--';
    if (cardIngresso) cardIngresso.textContent = aluno.ingresso || '--';

    const boletim = safeArray(data.boletim);
    const totalFaltas = boletim.reduce((sum, d) => sum + (parseInt(d.numero_faltas) || 0), 0);
    
    if (cardFaltas) cardFaltas.textContent = totalFaltas;
    if (cardDisciplinas) cardDisciplinas.textContent = boletim.length;

    const containerAval = document.getElementById('dashboard-avaliacoes');
    const avaliacoes = safeArray(data.avaliacoes);
    
    if (containerAval) {
        if (avaliacoes.length === 0) {
            containerAval.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <p>Nenhuma avaliação agendada</p>
                </div>
            `;
        } else {
            containerAval.innerHTML = avaliacoes.slice(0, 3).map(av => `
                <div class="timeline-item" style="margin-bottom: 16px;">
                    <div class="timeline-date"><i class="fas fa-clock"></i> ${formatarData(av.data)} às ${av.hora_inicio || '--:--'}</div>
                    <div class="timeline-title">${av.descricao || 'Avaliação'}</div>
                    <div class="timeline-desc">${av.componente_curricular || ''}</div>
                </div>
            `).join('');
        }
    }

    const containerBoletim = document.getElementById('dashboard-boletim-resumo');
    if (containerBoletim) {
        if (boletim.length === 0) {
            containerBoletim.innerHTML = `<div class="empty-state"><i class="fas fa-file-alt"></i><p>Nenhuma disciplina</p></div>`;
        } else {
            const html = boletim.slice(0, 5).map(d => {
                const media = parseFloat(d.media_final_disciplina) || parseFloat(d.media_disciplina) || 0;
                let situacaoClass = 'tag-cursando';
                if (d.situacao === 'Aprovado') situacaoClass = 'tag-aprovado';
                else if (d.situacao === 'Reprovado') situacaoClass = 'tag-reprovado';
                
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 18px; background: rgba(255,255,255,0.03); border-radius: 16px; margin-bottom: 12px; border: 1px solid var(--glass-border);">
                        <div>
                            <div style="font-weight: 600; margin-bottom: 4px;">${d.disciplina || 'Disciplina'}</div>
                            <div style="font-size: 0.85rem; color: var(--ios-text-secondary);">Média: ${media || '--'}</div>
                        </div>
                        <span class="situacao-badge ${situacaoClass}">${d.situacao || 'Cursando'}</span>
                    </div>
                `;
            }).join('');
            containerBoletim.innerHTML = html;
        }
    }
}

function preencherPerfil(data) {
    const aluno = safeObject(data.aluno);
    const nome = aluno.nome_usual || aluno.nome || 'Aluno';
    const foto = aluno.foto || aluno.url_foto_75x100;

    const nomeEl = document.getElementById('perfil-nome');
    const matriculaEl = document.getElementById('perfil-matricula');
    const emailEl = document.getElementById('perfil-email');

    if (nomeEl) nomeEl.textContent = nome;
    if (matriculaEl) matriculaEl.textContent = aluno.identificacao || '--';
    if (emailEl) emailEl.textContent = aluno.email_academico || aluno.email || '--';

    const avatarEl = document.getElementById('perfil-avatar');
    if (avatarEl) {
        if (foto) {
            avatarEl.innerHTML = `<img src="${foto}" alt="Foto" onerror="this.parentElement.innerHTML='<span id=\'perfil-avatar-text\'>${nome.charAt(0)}</span>'">`;
        } else {
            avatarEl.innerHTML = `<span id="perfil-avatar-text">${nome.charAt(0).toUpperCase()}</span>`;
        }
    }

    const detalhesEl = document.getElementById('perfil-detalhes');
    if (detalhesEl) {
        const campos = [
            { label: 'Nome Completo', value: aluno.nome || aluno.nome_registro },
            { label: 'Nome Usual', value: aluno.nome_usual },
            { label: 'Matrícula', value: aluno.matricula },
            { label: 'CPF', value: aluno.cpf },
            { label: 'E-mail Acadêmico', value: aluno.email_academico },
            { label: 'Curso', value: aluno.curso },
            { label: 'Campus', value: aluno.campus },
            { label: 'Situação', value: aluno.situacao },
            { label: 'IRA', value: aluno.ira },
            { label: 'Ano de Ingresso', value: aluno.ingresso }
        ];

        detalhesEl.innerHTML = campos
            .filter(c => c.value)
            .map(c => `
                <div class="info-row">
                    <span class="info-label" style="font-size: 0.875rem;">${c.label}</span>
                    <span class="info-value" style="font-size: 0.875rem;">${c.value}</span>
                </div>
            `).join('');
    }
}

function preencherPeriodos(data) {
    const periodos = safeArray(data.periodos);
    const container = document.getElementById('periodos-grid');
    
    const anos = [...new Set(periodos.map(p => p.ano_letivo))].sort((a, b) => b - a);

    const headerSelect = document.getElementById('ano-select');
    if (headerSelect) {
        headerSelect.innerHTML = anos.map(ano => 
            `<option value="${ano}" ${ano === anoAtual ? 'selected' : ''}>${ano}</option>`
        ).join('');
    }

    if (container) {
        if (anos.length === 0) {
            container.innerHTML = '<p style="color: var(--ios-text-secondary); text-align: center; padding: 40px;">Nenhum período encontrado</p>';
        } else {
            container.innerHTML = anos.map(ano => `
                <div class="periodo-card ${ano === anoAtual ? 'active' : ''}" onclick="trocarAno(${ano})">
                    <div class="periodo-ano">${ano}</div>
                    <div class="periodo-status">${ano === anoAtual ? 'Período Atual' : 'Clique para visualizar'}</div>
                </div>
            `).join('');
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

    const html = `
        <table class="ios-table">
            <thead>
                <tr>
                    <th>Disciplina</th>
                    <th style="text-align: center;">1ª Etapa</th>
                    <th style="text-align: center;">2ª Etapa</th>
                    <th style="text-align: center;">3ª Etapa</th>
                    <th style="text-align: center;">4ª Etapa</th>
                    <th style="text-align: center;">Média</th>
                    <th style="text-align: center;">Situação</th>
                </tr>
            </thead>
            <tbody>
                ${boletim.map(d => {
                    const n1 = d.nota_etapa_1?.nota || '--';
                    const n2 = d.nota_etapa_2?.nota || '--';
                    const n3 = d.nota_etapa_3?.nota || '--';
                    const n4 = d.nota_etapa_4?.nota || '--';
                    const media = d.media_disciplina || d.media_final_disciplina || '--';
                    
                    const n1Num = parseFloat(n1) || 0;
                    const n2Num = parseFloat(n2) || 0;
                    const n3Num = parseFloat(n3) || 0;
                    const n4Num = parseFloat(n4) || 0;
                    
                    let situacaoClass = 'tag-cursando';
                    if (d.situacao === 'Aprovado') situacaoClass = 'tag-aprovado';
                    else if (d.situacao === 'Reprovado') situacaoClass = 'tag-reprovado';
                    
                    return `
                        <tr>
                            <td>
                                <div class="disciplina-info">
                                    <h4>${d.disciplina || 'Disciplina'}</h4>
                                    <p>Faltas: ${d.numero_faltas || 0} | Freq: ${d.percentual_carga_horaria_frequentada || 0}%</p>
                                </div>
                            </td>
                            <td style="text-align: center;"><span class="nota-badge ${n1Num >= 60 ? 'nota-aprovado' : (n1Num >= 40 ? 'nota-recuperacao' : 'nota-reprovado')}">${n1}</span></td>
                            <td style="text-align: center;"><span class="nota-badge ${n2Num >= 60 ? 'nota-aprovado' : (n2Num >= 40 ? 'nota-recuperacao' : 'nota-reprovado')}">${n2}</span></td>
                            <td style="text-align: center;"><span class="nota-badge ${n3Num >= 60 ? 'nota-aprovado' : (n3Num >= 40 ? 'nota-recuperacao' : 'nota-reprovado')}">${n3}</span></td>
                            <td style="text-align: center;"><span class="nota-badge ${n4Num >= 60 ? 'nota-aprovado' : (n4Num >= 40 ? 'nota-recuperacao' : 'nota-reprovado')}">${n4}</span></td>
                            <td style="text-align: center; font-weight: 700; font-size: 1.1rem;">${media}</td>
                            <td style="text-align: center;"><span class="situacao-badge ${situacaoClass}">${d.situacao || 'Cursando'}</span></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

function preencherHorarios(data) {
    const turmas = safeArray(data.turmas);
    const container = document.getElementById('horarios-content');
    if (!container) return;

    const horariosParseados = [];
    turmas.forEach(turma => {
        if (turma.horarios_de_aula) {
            const codigos = turma.horarios_de_aula.split(' / ');
            codigos.forEach(cod => {
                const parsed = parseHorario(cod.trim());
                if (parsed) {
                    horariosParseados.push({
                        ...parsed,
                        disciplina: turma.descricao,
                        sigla: turma.sigla,
                        local: turma.locais_de_aula?.[0] || 'Local não definido'
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
            html += `<div class="dia-card">`;
            html += `<div class="dia-header"><i class="fas fa-calendar-day"></i> ${diasSemana[dia]}</div>`;
            
            const ordemTurno = { 'M': 1, 'V': 2, 'N': 3 };
            aulasDia.sort((a, b) => {
                if (ordemTurno[a.turno] !== ordemTurno[b.turno]) {
                    return ordemTurno[a.turno] - ordemTurno[b.turno];
                }
                return a.horas[0] - b.horas[0];
            });
            
            aulasDia.forEach(aula => {
                const tagClass = { 'M': 'tag-manha', 'V': 'tag-tarde', 'N': 'tag-noite' }[aula.turno] || 'tag-manha';
                
                html += `
                    <div class="aula-card">
                        <div class="aula-info">
                            <h4>${aula.disciplina}</h4>
                            <p><i class="fas fa-map-marker-alt"></i> ${aula.local.split(' - ')[0]}</p>
                        </div>
                        <div style="text-align: right;">
                            <span class="aula-tag ${tagClass}">${aula.turnoNome}</span>
                            <div style="margin-top: 6px; font-size: 0.85rem; color: var(--ios-text-secondary); font-weight: 600;">
                                ${aula.horasStr} aula
                            </div>
                        </div>
                    </div>
                `;
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
        const horarios = t.horarios_de_aula ? t.horarios_de_aula.split(' / ') : [];
        const horariosHtml = horarios.map(h => {
            const parsed = parseHorario(h.trim());
            if (parsed) {
                return `<span style="background: rgba(48, 209, 88, 0.15); color: var(--ios-accent-green); padding: 4px 12px; border-radius: 8px; font-size: 0.75rem; margin-right: 6px; border: 1px solid rgba(48, 209, 88, 0.3); font-weight: 600;">${parsed.diaNome} - ${parsed.turnoNome}</span>`;
            }
            return '';
        }).join('');
        
        return `
            <div class="turma-item">
                <span class="turma-badge">${t.sigla || '---'}</span>
                <div class="turma-nome">${t.descricao || 'Disciplina'}</div>
                ${t.observacao ? `<div style="font-size: 0.9rem; color: var(--ios-accent-orange); margin-bottom: 12px;"><i class="fas fa-info-circle"></i> ${t.observacao}</div>` : ''}
                <div style="margin-bottom: 12px;">${horariosHtml}</div>
                <div class="turma-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${t.locais_de_aula?.[0]?.split(' - ')[0] || 'Local não definido'}</span>
                </div>
            </div>
        `;
    }).join('');
}

function preencherAvaliacoes(data) {
    const avaliacoes = safeArray(data.avaliacoes);
    const container = document.getElementById('avaliacoes-timeline');
    if (!container) return;

    if (avaliacoes.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-clipboard-check"></i><p>Nenhuma avaliação agendada</p></div>`;
        return;
    }

    const sorted = [...avaliacoes].sort((a, b) => new Date(a.data) - new Date(b.data));

    container.innerHTML = sorted.map(av => `
        <div class="timeline-item">
            <div class="timeline-date">
                <i class="fas fa-calendar-day"></i> ${formatarData(av.data)} 
                <span style="margin-left: 12px;"><i class="fas fa-clock"></i> ${av.hora_inicio || '--:--'}</span>
            </div>
            <div class="timeline-title">${av.descricao || 'Avaliação'}</div>
            <div class="timeline-desc">
                <strong>Disciplina:</strong> ${av.componente_curricular || 'Não informada'}<br>
                <strong>Tipo:</strong> ${av.tipo || 'Prova'} | <strong>Peso:</strong> ${av.peso || '-'}
            </div>
        </div>
    `).join('');
}

function formatarData(dataStr) {
    if (!dataStr) return 'Data não definida';
    try {
        const data = new Date(dataStr);
        if (isNaN(data.getTime())) return dataStr;
        return data.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
        });
    } catch (e) {
        return dataStr;
    }
}

function mudarPeriodoBoletim() {}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando aplicação...');
    carregarDados();
    initializeFuse();
    
    // Garante que as funções estão no escopo global
    window.performSmartSearch = performSmartSearch;
    window.handleSearchInput = handleSearchInput;
    window.selectRoom = selectRoom;
    window.selectBuilding = selectBuilding;
    window.zoomMap = zoomMap;
    window.resetMap = resetMap;
    window.showSection = showSection;
    window.toggleSidebar = toggleSidebar;
    window.closeSidebar = closeSidebar;
    window.logout = logout;
    window.trocarAno = trocarAno;
    
    console.log('Funções registradas globalmente!');
});