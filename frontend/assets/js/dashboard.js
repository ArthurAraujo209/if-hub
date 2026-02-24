// dashboard.js - Versão completa com todas as funções do mapa

const API_URL = 'https://if-hub-backend.onrender.com/api';
let dadosGlobais = null;
let dadosAluno = null;
let anoAtual = new Date().getFullYear();
let searchTimeout = null; // Para o debounce da busca

// Database de salas do Campus Santa Cruz (baseado em dados reais da estrutura)
const roomsDatabase = [
    // Bloco A - Administrativo e Biblioteca
    { id: 'biblioteca', name: 'Biblioteca Central', block: 'A', floor: 'Térreo', room: 'A-101', type: 'biblioteca', keywords: ['biblioteca', 'livros', 'estudo', 'leitura', 'acervo'] },
    { id: 'sec-academica', name: 'Secretaria Acadêmica', block: 'A', floor: 'Térreo', room: 'A-102', type: 'administrativo', keywords: ['secretaria', 'acadêmica', 'matrícula', 'documentos', 'declaração'] },
    { id: 'direcao', name: 'Direção/Gabinete', block: 'A', floor: '1º Andar', room: 'A-201', type: 'administrativo', keywords: ['direção', 'diretor', 'coordenação', 'gabinete'] },
    { id: 'sala-prof', name: 'Sala dos Professores', block: 'A', floor: '1º Andar', room: 'A-202', type: 'administrativo', keywords: ['professores', 'docentes', 'sala dos professores'] },
    { id: 'sala-video', name: 'Sala de Videoconferência', block: 'A', floor: '2º Andar', room: 'A-301', type: 'sala', keywords: ['vídeo', 'video', 'conferência', 'zoom', 'meet'] },
    { id: 'coord-curso', name: 'Coordenação de Curso', block: 'A', floor: '1º Andar', room: 'A-203', type: 'administrativo', keywords: ['coordenação', 'coordenador', 'curso'] },
    { id: 'cpa', name: 'Comissão Própria de Avaliação', block: 'A', floor: '2º Andar', room: 'A-302', type: 'administrativo', keywords: ['cpa', 'avaliação', 'enade'] },
    
    // Bloco B - Salas de Aula e Laboratórios de Informática
    { id: 'lab-info-1', name: 'Laboratório de Informática 1', block: 'B', floor: 'Térreo', room: 'B-105', type: 'laboratório', keywords: ['lab', 'informática', 'computador', 'ti', 'b-105'] },
    { id: 'lab-info-2', name: 'Laboratório de Informática 2', block: 'B', floor: 'Térreo', room: 'B-106', type: 'laboratório', keywords: ['lab', 'informática', 'computador', 'b-106'] },
    { id: 'lab-info-3', name: 'Laboratório de Informática 3', block: 'B', floor: '1º Andar', room: 'B-205', type: 'laboratório', keywords: ['lab', 'informática', 'computador', 'b-205'] },
    { id: 'sala-201', name: 'Sala de Aula 201', block: 'B', floor: '2º Andar', room: 'B-301', type: 'sala', keywords: ['sala', 'aula', 'b-301', '201'] },
    { id: 'sala-202', name: 'Sala de Aula 202', block: 'B', floor: '2º Andar', room: 'B-302', type: 'sala', keywords: ['sala', 'aula', 'b-302', '202'] },
    { id: 'sala-203', name: 'Sala de Aula 203', block: 'B', floor: '2º Andar', room: 'B-303', type: 'sala', keywords: ['sala', 'aula', 'b-303', '203'] },
    { id: 'sala-101', name: 'Sala de Aula 101', block: 'B', floor: '1º Andar', room: 'B-201', type: 'sala', keywords: ['101', 'sala 101', 'b-201'] },
    { id: 'sala-102', name: 'Sala de Aula 102', block: 'B', floor: '1º Andar', room: 'B-202', type: 'sala', keywords: ['102', 'sala 102', 'b-202'] },
    { id: 'sala-103', name: 'Sala de Aula 103', block: 'B', floor: '1º Andar', room: 'B-203', type: 'sala', keywords: ['103', 'sala 103', 'b-203'] },
    
    // Bloco C - Ciências, Laboratórios Especializados e Auditório
    { id: 'lab-quimica', name: 'Laboratório de Química', block: 'C', floor: 'Térreo', room: 'C-101', type: 'laboratório', keywords: ['lab', 'química', 'quimica', 'c-101'] },
    { id: 'lab-fisica', name: 'Laboratório de Física', block: 'C', floor: 'Térreo', room: 'C-102', type: 'laboratório', keywords: ['lab', 'física', 'fisica', 'c-102'] },
    { id: 'lab-biologia', name: 'Laboratório de Biologia', block: 'C', floor: 'Térreo', room: 'C-103', type: 'laboratório', keywords: ['lab', 'biologia', 'bio', 'c-103'] },
    { id: 'sala-musica', name: 'Sala de Música', block: 'C', floor: '1º Andar', room: 'C-345', type: 'sala especial', keywords: ['música', 'musica', 'som', 'instrumento', '345', 'c-345'] },
    { id: 'sala-artes', name: 'Sala de Artes Visuais', block: 'C', floor: '1º Andar', room: 'C-346', type: 'sala especial', keywords: ['artes', 'desenho', 'pintura', 'c-346'] },
    { id: 'auditorio', name: 'Auditório Central', block: 'C', floor: '2º Andar', room: 'C-401', type: 'auditório', keywords: ['auditório', 'auditorio', 'eventos', 'palestras', 'c-401'] },
    { id: 'lab-idiomas', name: 'Laboratório de Idiomas', block: 'C', floor: '2º Andar', room: 'C-301', type: 'laboratório', keywords: ['idiomas', 'inglês', 'ingles', 'espanhol', 'c-301'] },
    
    // Bloco D - Técnicos, Workshops e NCE
    { id: 'lab-eletrica', name: 'Laboratório de Eletricidade', block: 'D', floor: 'Térreo', room: 'D-110', type: 'laboratório técnico', keywords: ['lab', 'eletricidade', 'elétrica', 'eletrica', 'd-110'] },
    { id: 'lab-mecanica', name: 'Laboratório de Mecânica', block: 'D', floor: 'Térreo', room: 'D-111', type: 'laboratório técnico', keywords: ['lab', 'mecânica', 'mecanica', 'd-111'] },
    { id: 'oficina-auto', name: 'Oficina de Automação', block: 'D', floor: '1º Andar', room: 'D-210', type: 'oficina', keywords: ['oficina', 'automação', 'automacao', 'robótica', 'd-210'] },
    { id: 'lab-redes', name: 'Laboratório de Redes', block: 'D', floor: '1º Andar', room: 'D-211', type: 'laboratório', keywords: ['lab', 'redes', 'network', 'cisco', 'd-211'] },
    { id: 'nce', name: 'Núcleo de Computação', block: 'D', floor: '2º Andar', room: 'D-305', type: 'administrativo', keywords: ['nce', 'computação', 'ti', 'suporte', 'd-305'] },
    { id: 'almoxarifado', name: 'Almoxarifado', block: 'D', floor: 'Subsolo', room: 'D-001', type: 'administrativo', keywords: ['almoxarifado', 'material', 'd-001'] },
    
    // Bloco E - Novo/Módulos
    { id: 'sala-345', name: 'Sala 345 - Música', block: 'E', floor: '3º Andar', room: 'E-345', type: 'sala especial', keywords: ['345', 'música', 'musica', 'e-345'] },
    { id: 'lab-robotica', name: 'Laboratório de Robótica', block: 'E', floor: 'Térreo', room: 'E-120', type: 'laboratório', keywords: ['robótica', 'robotica', 'arduino', 'e-120'] },
    { id: 'sala-501', name: 'Sala de Aula 501', block: 'E', floor: '5º Andar', room: 'E-501', type: 'sala', keywords: ['sala', 'aula', '501', 'e-501'] },
    { id: 'sala-502', name: 'Sala de Aula 502', block: 'E', floor: '5º Andar', room: 'E-502', type: 'sala', keywords: ['sala', 'aula', '502', 'e-502'] },
    
    // Bloco F - Extensão e Serviços
    { id: 'cantina', name: 'Cantina/Restaurante Universitário', block: 'F', floor: 'Térreo', room: 'F-001', type: 'alimentação', keywords: ['cantina', 'ru', 'restaurante', 'comida', 'lanche'] },
    { id: 'xerox', name: 'Central de Xerox', block: 'F', floor: 'Térreo', room: 'F-002', type: 'serviço', keywords: ['xerox', 'cópia', 'copia', 'impressão', 'impressao'] },
    { id: 'biblioteca-setorial', name: 'Biblioteca Setorial', block: 'F', floor: '1º Andar', room: 'F-101', type: 'biblioteca', keywords: ['biblioteca', 'setorial', 'livros', 'f-101'] },
    { id: 'sala-estudo', name: 'Sala de Estudo em Grupo', block: 'F', floor: '1º Andar', room: 'F-102', type: 'sala', keywords: ['estudo', 'grupo', 'sala de estudo', 'f-102'] },
    { id: 'dce', name: 'Diretório Central dos Estudantes', block: 'F', floor: '2º Andar', room: 'F-201', type: 'estudantil', keywords: ['dce', 'estudantes', 'representação', 'f-201'] },
    { id: 'ca', name: 'Centro Acadêmico', block: 'F', floor: '2º Andar', room: 'F-202', type: 'estudantil', keywords: ['ca', 'centro acadêmico', 'academico', 'f-202'] },
    { id: 'pastoral', name: 'Pastoral do Campus', block: 'F', floor: 'Térreo', room: 'F-003', type: 'apoio', keywords: ['pastoral', 'religioso', 'apoio', 'f-003'] },
    
    // Áreas Comuns e Externas
    { id: 'quadra', name: 'Quadra Poliesportiva', block: 'Externo', floor: '-', room: 'Quadra', type: 'esporte', keywords: ['quadra', 'esporte', 'futsal', 'basquete', 'vôlei'] },
    { id: 'estacionamento', name: 'Estacionamento Principal', block: 'Externo', floor: '-', room: 'Estacionamento', type: 'estacionamento', keywords: ['estacionamento', 'carro', 'moto', 'veículo'] },
    { id: 'jardim', name: 'Jardim Botânico/Área Verde', block: 'Externo', floor: '-', room: 'Jardim', type: 'área verde', keywords: ['jardim', 'verde', 'natureza', 'área externa'] },
    { id: 'saude', name: 'Posto de Saúde/Enfermaria', block: 'A', floor: 'Térreo', room: 'A-103', type: 'saúde', keywords: ['saúde', 'saude', 'enfermaria', 'médico', 'medico', 'a-103'] },
    { id: 'manutencao', name: 'Manutenção Predial', block: 'Externo', floor: '-', room: 'Manutenção', type: 'serviço', keywords: ['manutenção', 'manutencao', 'conserto', 'predial'] }
];

// Dados dos blocos (para o mapa 3D)
const buildingData = {
    'B': {
        nome: 'Bloco B',
        descricao: 'Salas de Aula, Centro de Convivência e Espaço Cultural',
        andares: {
            'Térreo': ['Centro de Convivência', 'Espaço Cultural', 'Aquário', 'Banheiros'],
            '1º Andar': ['Salas de Professores', 'Sala de Reuniões', 'Coordenação de Curso'],
            '2º Andar': ['Salas de Aula (201-205)', 'Laboratório de Idiomas']
        },
        icon: 'building',
        cor: 'var(--ios-accent-green)'
    },
    'A': {
        nome: 'Bloco A',
        descricao: 'Licenciatura, Laboratórios e Administração',
        andares: {
            'Térreo': ['Auditório', 'Lab. Informática', 'Lab. Química', 'Secretaria'],
            '1º Andar': ['Lab. Eletrônica', 'Lab. Matemática', 'Salas de Aula'],
            '2º Andar': ['Coordenação Geral', 'Direção', 'Sala de Professores']
        },
        icon: 'flask',
        cor: 'var(--ios-accent-purple)'
    },
    '5': {
        nome: 'Bloco 5',
        descricao: 'Mecânica e Refrigeração',
        andares: {
            'Térreo': ['Oficina Mecânica', 'Lab. de Usinagem'],
            '1º Andar': ['Lab. de Refrigeração', 'Salas de Aula Técnicas']
        },
        icon: 'cogs',
        cor: 'var(--ios-accent-purple)'
    },
    '1': {
        nome: 'Guarita/Portaria',
        descricao: 'Entrada principal do campus',
        andares: { 'Térreo': ['Portaria', 'Segurança', 'Controle de Acesso'] },
        icon: 'shield-alt',
        cor: 'var(--ios-accent-blue)'
    },
    '2': {
        nome: 'Cantina & Saúde',
        descricao: 'Alimentação e atendimento médico',
        andares: { 'Térreo': ['Cantina', 'Restaurante Universitário', 'Posto de Saúde'] },
        icon: 'utensils',
        cor: 'var(--ios-accent-yellow)'
    },
    '3': {
        nome: 'Almoxarifado',
        descricao: 'Armazenamento e logística',
        andares: { 'Térreo': ['Almoxarifado Central', 'Depósito de Materiais'] },
        icon: 'boxes',
        cor: 'var(--ios-accent-blue)'
    },
    'areia': {
        nome: 'Quadra de Areia',
        descricao: 'Esportes de praia',
        andares: { 'Externo': ['Vôlei de Praia', 'Futevôlei', 'Frescobol'] },
        icon: 'volleyball-ball',
        cor: 'var(--ios-accent-orange)'
    },
    '4': {
        nome: 'Espaço Multiuso',
        descricao: 'Atividades diversas',
        andares: { 'Térreo': ['Ginástica', 'Tênis de Mesa', 'Eventos'] },
        icon: 'table-tennis',
        cor: 'var(--ios-accent-orange)'
    },
    'quadra': {
        nome: 'Quadra Poliesportiva',
        descricao: 'Esportes coletivos',
        andares: { 'Externo': ['Basquete', 'Futsal', 'Vôlei', 'Vestiários', 'Academia dos Servidores'] },
        icon: 'basketball-ball',
        cor: 'var(--ios-accent-orange)'
    },
    '6': {
        nome: 'Piscina',
        descricao: 'Natação e lazer',
        andares: { 'Externo': ['Piscina Olímpica', 'Vestiários', 'Área de Lazer'] },
        icon: 'swimming-pool',
        cor: 'var(--ios-accent-blue)'
    }
};

// Variáveis globais do mapa
let currentZoom = 1;
let selectedBuilding = null;

// Funções utilitárias
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
    // Atualiza navegação desktop
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    } else {
        // Se chamado programaticamente, ativa o link correspondente
        const activeLink = Array.from(document.querySelectorAll('.nav-link')).find(link =>
            link.getAttribute('onclick') && link.getAttribute('onclick').includes(sectionName)
        );
        if (activeLink) activeLink.classList.add('active');
    }

    // Atualiza navegação mobile
    document.querySelectorAll('.mobile-menu-item').forEach(item => item.classList.remove('active'));
    const mobileItem = Array.from(document.querySelectorAll('.mobile-menu-item')).find(item =>
        item.getAttribute('onclick') && item.getAttribute('onclick').includes(sectionName)
    );
    if (mobileItem) mobileItem.classList.add('active');

    // Esconde todas as seções
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

    // Mostra seção alvo
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Atualiza título
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

    // Fecha sidebar no mobile
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

// Logout
async function logout() {
    try {
        await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {}
    localStorage.removeItem('suap_token');
    window.location.href = '/index.html';
}

// Alertas
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

// Loading
function mostrarLoading() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'flex';
}

function esconderLoading() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'none';
}

// Troca de ano
async function trocarAno(novoAno) {
    anoAtual = parseInt(novoAno);
    mostrarLoading();
    await carregarDadosAno(anoAtual);
    esconderLoading();
}

// Carregar dados
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

// Preencher seções
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

    // Avaliações
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

    // Boletim resumo
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

// Funções do Mapa
function selectBuilding(id) {
    const data = buildingData[id];
    if (!data) return;

    // Remove active de todos
    document.querySelectorAll('.building-3d').forEach(b => b.classList.remove('active'));

    // Adiciona active no selecionado
    const building = document.querySelector(`[data-id="${id}"]`);
    if (building) building.classList.add('active');

    selectedBuilding = id;

    // Atualiza painel
    const panel = document.getElementById('info-panel');
    const title = document.getElementById('panel-title');
    const content = document.getElementById('panel-content');

    title.innerHTML = `<i class="fas fa-${data.icon}" style="color: ${data.cor};"></i> <span>${data.nome}</span>`;

    let andaresHtml = '';
    for (const [andar, salas] of Object.entries(data.andares)) {
        andaresHtml += `
            <div class="andar-item" onclick="toggleAndar(this)">
                <div class="andar-numero">${andar}</div>
                <div class="andar-nome">${salas.join(' • ')}</div>
            </div>
        `;
    }

    content.innerHTML = `
        <p style="color: var(--ios-text-secondary); margin-bottom: 20px; line-height: 1.5;">
            ${data.descricao}
        </p>
        <h4 style="margin-bottom: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-layer-group" style="color: var(--ios-accent-green);"></i>
            Andares e Salas
        </h4>
        <div class="andar-list">
            ${andaresHtml}
        </div>
    `;

    panel.classList.add('open');
}

function closePanel() {
    document.getElementById('info-panel').classList.remove('open');
    document.querySelectorAll('.building-3d').forEach(b => b.classList.remove('active'));
    selectedBuilding = null;
}

// Função de zoom (igual, mas garantindo que funciona)
function zoomMap(factor) {
    currentZoom *= factor;
    currentZoom = Math.max(0.5, Math.min(3, currentZoom));
    const container = document.getElementById('map-container');
    const image = document.getElementById('campus-image');
    if (image) {
        image.style.transform = `scale(${currentZoom})`;
        image.style.transition = 'transform 0.3s ease';
    }
}

function resetMap() {
    currentZoom = 1;
    const image = document.getElementById('campus-image');
    if (image) image.style.transform = 'scale(1)';
    closeBottomPanel();
}

function searchMap() {
    const query = document.getElementById('map-search').value.toLowerCase();
    if (!query) return;

    // Busca em todos os blocos
    for (const [id, data] of Object.entries(buildingData)) {
        if (data.nome.toLowerCase().includes(query) ||
            data.descricao.toLowerCase().includes(query) ||
            Object.values(data.andares).flat().some(s => s.toLowerCase().includes(query))) {
            selectBuilding(id);

            // Scroll para o elemento
            const element = document.querySelector(`[data-id="${id}"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            }
            return;
        }
    }

    alert('Bloco ou sala não encontrada');
}

// Funções de busca de salas (outro sistema de busca, talvez duplicado, mas mantendo)
function searchRoom() {
    const query = document.getElementById('room-search').value.toLowerCase().trim();
    if (!query) {
        showAlert('Digite algo para buscar');
        return;
    }
    
    const results = roomsDatabase.filter(room => {
        const matchName = room.name.toLowerCase().includes(query);
        const matchRoom = room.room.toLowerCase().includes(query);
        const matchKeywords = room.keywords.some(k => k.toLowerCase().includes(query));
        return matchName || matchRoom || matchKeywords;
    });
    
    const resultContainer = document.getElementById('room-result');
    const titleEl = document.getElementById('room-title');
    const detailsEl = document.getElementById('room-details');
    
    if (results.length === 0) {
        resultContainer.classList.add('show');
        titleEl.innerHTML = '<i class="fas fa-times-circle" style="color: var(--ios-accent-red);"></i> Nenhuma sala encontrada';
        titleEl.style.color = 'var(--ios-accent-red)';
        detailsEl.innerHTML = '<p style="color: var(--ios-text-secondary);">Tente buscar por: número da sala, bloco, ou tipo (ex: laboratório, biblioteca, 345)</p>';
        return;
    }
    
    const room = results[0];
    
    resultContainer.classList.add('show');
    titleEl.style.color = 'var(--ios-accent-green)';
    titleEl.innerHTML = `<i class="fas fa-check-circle"></i> ${room.name} <span style="background: var(--gradient-primary); padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; margin-left: 12px;">Bloco ${room.block}</span>`;
    
    detailsEl.innerHTML = `
        <div class="detail-card">
            <i class="fas fa-door-open"></i>
            <div>
                <strong>Sala</strong>
                <span>${room.room}</span>
            </div>
        </div>
        <div class="detail-card">
            <i class="fas fa-building"></i>
            <div>
                <strong>Bloco</strong>
                <span>${room.block}</span>
            </div>
        </div>
        <div class="detail-card">
            <i class="fas fa-layer-group"></i>
            <div>
                <strong>Andar</strong>
                <span>${room.floor}</span>
            </div>
        </div>
        <div class="detail-card">
            <i class="fas fa-tag"></i>
            <div>
                <strong>Tipo</strong>
                <span>${room.type}</span>
            </div>
        </div>
    `;
    
    if (results.length > 1) {
        detailsEl.innerHTML += `
            <div style="grid-column: 1 / -1; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--glass-border);">
                <div style="font-size: 0.9rem; color: var(--ios-text-secondary); margin-bottom: 12px; font-weight: 600;">Outras opções encontradas:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${results.slice(1, 4).map(r => `
                        <span style="background: rgba(255,255,255,0.05); padding: 8px 14px; border-radius: 10px; font-size: 0.85rem; cursor: pointer; border: 1px solid var(--glass-border); font-weight: 500;" 
                              onclick="quickSearch('${r.keywords[0]}')">
                            ${r.name}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    }
}



// Utilitários
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

function mudarPeriodoBoletim() {
    // Implementar se necessário
}

// Iniciar
document.addEventListener('DOMContentLoaded', carregarDados);


// Fuzzy Search Implementation with Levenshtein Distance
class FuzzySearcher {
    constructor(items, options = {}) {
        this.items = items;
        this.options = {
            keys: options.keys || ['name', 'keywords'],
            threshold: options.threshold || 0.6,
            maxResults: options.maxResults || 8,
            ...options
        };
    }

    // Optimized Levenshtein distance for short strings (building/room names)
    levenshteinDistance(str1, str2) {
        const s1 = str1.toLowerCase();
        const s2 = str2.toLowerCase();

        if (s1 === s2) return 0;
        if (s1.length === 0) return s2.length;
        if (s2.length === 0) return s1.length;

        // Use shorter string as columns for memory efficiency
        const short = s1.length < s2.length ? s1 : s2;
        const long = s1.length < s2.length ? s2 : s1;

        let prevRow = new Array(short.length + 1).fill(0);
        let currRow = new Array(short.length + 1).fill(0);

        for (let i = 0; i <= short.length; i++) {
            prevRow[i] = i;
        }

        for (let i = 1; i <= long.length; i++) {
            currRow[0] = i;
            for (let j = 1; j <= short.length; j++) {
                const cost = long[i - 1] === short[j - 1] ? 0 : 1;
                currRow[j] = Math.min(
                    prevRow[j] + 1,      // deletion
                    currRow[j - 1] + 1,  // insertion
                    prevRow[j - 1] + cost // substitution
                );
            }
            [prevRow, currRow] = [currRow, prevRow];
        }

        return prevRow[short.length];
    }

    // Calculate similarity score (0-1, higher is better)
    calculateScore(query, text) {
        if (!query || !text) return 0;

        const q = query.toLowerCase().trim();
        const t = text.toLowerCase().trim();

        // Exact match
        if (t === q) return 1.0;

        // Starts with query
        if (t.startsWith(q)) return 0.9;

        // Contains query
        if (t.includes(q)) return 0.8;

        // Word boundary match
        const words = t.split(/[\s\-_]/);
        for (let word of words) {
            if (word.startsWith(q)) return 0.75;
        }

        // Levenshtein distance for typos (only for strings under 20 chars for performance)
        if (q.length <= 15 && t.length <= 20) {
            const distance = this.levenshteinDistance(q, t);
            const maxLen = Math.max(q.length, t.length);
            const similarity = 1 - (distance / maxLen);

            // Only return if reasonably similar (allows 1-2 typos)
            if (distance <= 2 && similarity >= 0.7) {
                return similarity * 0.7;
            }
        }

        return 0;
    }

    search(query) {
        if (!query || query.length < 1) return [];

        const results = [];

        for (let item of this.items) {
            let maxScore = 0;
            let matchedField = '';

            // Check all configured keys
            for (let key of this.options.keys) {
                if (Array.isArray(item[key])) {
                    // Array of keywords
                    for (let keyword of item[key]) {
                        const score = this.calculateScore(query, keyword);
                        if (score > maxScore) {
                            maxScore = score;
                            matchedField = keyword;
                        }
                    }
                } else if (item[key]) {
                    // Single string value
                    const score = this.calculateScore(query, item[key]);
                    if (score > maxScore) {
                        maxScore = score;
                        matchedField = item[key];
                    }
                }
            }

            if (maxScore >= this.options.threshold) {
                results.push({
                    item: item,
                    score: maxScore,
                    matchedField: matchedField
                });
            }
        }

        // Sort by score descending
        results.sort((a, b) => b.score - a.score);

        return results.slice(0, this.options.maxResults);
    }
}

// Initialize fuzzy searchers
let roomSearcher = null;
let buildingSearcher = null;
let searchDebounceTimer = null;
let selectedSuggestionIndex = -1;

function initializeSearchers() {
    // Room searcher with typo tolerance
    roomSearcher = new FuzzySearcher(roomsDatabase, {
        keys: ['name', 'room', 'keywords'],
        threshold: 0.4,  // Lower threshold to catch typos
        maxResults: 6
    });

    // Building searcher
    const buildingArray = Object.entries(buildingData).map(([id, data]) => ({
        id: id,
        name: data.nome,
        description: data.descricao,
        keywords: [data.nome, data.descricao, ...Object.values(data.andares).flat()],
        type: 'building'
    }));

    buildingSearcher = new FuzzySearcher(buildingArray, {
        keys: ['name', 'description', 'keywords'],
        threshold: 0.4,
        maxResults: 4
    });
}

// Debounce function to prevent search on every keystroke
function debounce(func, wait) {
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(searchDebounceTimer);
            func(...args);
        };
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(later, wait);
    };
}

// Handle search input with debounce
const debouncedSearch = debounce((query) => {
    performSearch(query);
}, 150);

function handleSearchInput(value) {
    selectedSuggestionIndex = -1;
    debouncedSearch(value);
}

function handleSearchKeydown(event) {
    const suggestionsContainer = document.getElementById('search-suggestions');
    const suggestions = suggestionsContainer.querySelectorAll('.suggestion-item');

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
        updateSelection(suggestions);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
        updateSelection(suggestions);
    } else if (event.key === 'Enter') {
        event.preventDefault();
        if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
            suggestions[selectedSuggestionIndex].click();
        } else {
            searchMap();
        }
    } else if (event.key === 'Escape') {
        closeSuggestions();
    }
}

function updateSelection(suggestions) {
    suggestions.forEach((item, index) => {
        if (index === selectedSuggestionIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

function performSearch(query) {
    const suggestionsContainer = document.getElementById('search-suggestions');

    if (!query || query.length < 1) {
        closeSuggestions();
        return;
    }

    if (!roomSearcher || !buildingSearcher) {
        initializeSearchers();
    }

    // Search both rooms and buildings
    const roomResults = roomSearcher.search(query);
    const buildingResults = buildingSearcher.search(query);

    // Combine and sort by score
    const allResults = [
        ...roomResults.map(r => ({ ...r, type: 'room' })),
        ...buildingResults.map(r => ({ ...r, type: 'building' }))
    ].sort((a, b) => b.score - a.score).slice(0, 8);

    displaySuggestions(allResults, query);
}

function displaySuggestions(results, query) {
    const container = document.getElementById('search-suggestions');

    if (results.length === 0) {
        container.innerHTML = `
            <div class="suggestion-no-results">
                <i class="fas fa-search"></i>
                Nenhum resultado encontrado para "${escapeHtml(query)}"
                <br><small style="font-size: 0.8rem; opacity: 0.7;">Tente verificar a ortografia</small>
            </div>
        `;
        container.classList.add('active');
        return;
    }

    const html = results.map((result, index) => {
        const item = result.item;
        const type = result.type;

        if (type === 'room') {
            return `
                <div class="suggestion-item" onclick="selectRoom('${item.id}')" data-index="${index}">
                    <div class="suggestion-icon room">
                        <i class="fas fa-door-open"></i>
                    </div>
                    <div class="suggestion-content">
                        <div class="suggestion-title">${highlightMatch(item.name, query)}</div>
                        <div class="suggestion-meta">
                            <span><i class="fas fa-building"></i> Bloco ${item.block}</span>
                            <span><i class="fas fa-door-closed"></i> ${item.room}</span>
                            <span><i class="fas fa-layer-group"></i> ${item.floor}</span>
                        </div>
                    </div>
                    ${result.score < 0.8 ? `<span class="suggestion-match-score">${Math.round(result.score * 100)}%</span>` : ''}
                </div>
            `;
        } else {
            return `
                <div class="suggestion-item" onclick="selectBuilding('${item.id}')" data-index="${index}">
                    <div class="suggestion-icon building">
                        <i class="fas fa-building"></i>
                    </div>
                    <div class="suggestion-content">
                        <div class="suggestion-title">${highlightMatch(item.name, query)}</div>
                        <div class="suggestion-meta">
                            <span>${item.description}</span>
                        </div>
                    </div>
                    ${result.score < 0.8 ? `<span class="suggestion-match-score">${Math.round(result.score * 100)}%</span>` : ''}
                </div>
            `;
        }
    }).join('');

    container.innerHTML = html;
    container.classList.add('active');
}

function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark style="background: rgba(48, 209, 88, 0.3); color: inherit; padding: 0 2px; border-radius: 3px;">$1</mark>');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function closeSuggestions() {
    const container = document.getElementById('search-suggestions');
    container.classList.remove('active');
    selectedSuggestionIndex = -1;
}

function selectRoom(roomId) {
    const room = roomsDatabase.find(r => r.id === roomId);
    if (!room) return;

    closeSuggestions();
    document.getElementById('map-search').value = room.name;

    // Show room details in the panel below map
    showRoomDetails(room);

    // Try to find and highlight the building on map
    const buildingId = room.block;
    if (buildingData[buildingId]) {
        selectBuilding(buildingId, false);
    }
}

function showRoomDetails(room) {
    const panel = document.getElementById('info-panel-section');
    const title = document.getElementById('panel-title');
    const content = document.getElementById('panel-content');

    // Get building color based on block
    const buildingColors = {
        'A': 'var(--ios-accent-purple)',
        'B': 'var(--ios-accent-green)',
        'C': 'var(--ios-accent-blue)',
        'D': 'var(--ios-accent-orange)',
        'E': 'var(--ios-accent-teal)',
        'F': 'var(--ios-accent-yellow)'
    };
    const color = buildingColors[room.block] || 'var(--ios-accent-green)';

    title.innerHTML = `<i class="fas fa-door-open" style="color: ${color};"></i> <span>${escapeHtml(room.name)}</span>`;

    content.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px;">
            <div class="detail-card">
                <i class="fas fa-door-closed" style="color: var(--ios-accent-green);"></i>
                <div>
                    <strong>Sala</strong>
                    <span>${room.room}</span>
                </div>
            </div>
            <div class="detail-card">
                <i class="fas fa-building" style="color: var(--ios-accent-blue);"></i>
                <div>
                    <strong>Bloco</strong>
                    <span>${room.block}</span>
                </div>
            </div>
            <div class="detail-card">
                <i class="fas fa-layer-group" style="color: var(--ios-accent-purple);"></i>
                <div>
                    <strong>Andar</strong>
                    <span>${room.floor}</span>
                </div>
            </div>
            <div class="detail-card">
                <i class="fas fa-tag" style="color: var(--ios-accent-orange);"></i>
                <div>
                    <strong>Tipo</strong>
                    <span>${room.type}</span>
                </div>
            </div>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 12px; border: 1px solid var(--glass-border);">
            <strong style="display: block; margin-bottom: 8px; color: var(--ios-text-secondary);"><i class="fas fa-keywords"></i> Palavras-chave:</strong>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${room.keywords.map(k => `<span style="background: rgba(255,255,255,0.05); padding: 4px 12px; border-radius: 20px; font-size: 0.8rem;">${escapeHtml(k)}</span>`).join('')}
            </div>
        </div>
    `;

    panel.style.display = 'block';
    panel.classList.remove('hidden');

    // Scroll to panel on mobile
    if (window.innerWidth <= 768) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Modified selectBuilding to work with new panel location
function selectBuilding(id, scrollToPanel = true) {
    const data = buildingData[id];
    if (!data) return;

    // Remove active de todos
    document.querySelectorAll('.building-3d').forEach(b => b.classList.remove('active'));

    // Adiciona active no selecionado
    const building = document.querySelector(`[data-id="${id}"]`);
    if (building) building.classList.add('active');

    // Atualiza painel abaixo do mapa
    const panel = document.getElementById('info-panel-section');
    const title = document.getElementById('panel-title');
    const content = document.getElementById('panel-content');

    title.innerHTML = `<i class="fas fa-${data.icon}" style="color: ${data.cor};"></i> <span>${data.nome}</span>`;

    let andaresHtml = '';
    for (const [andar, salas] of Object.entries(data.andares)) {
        andaresHtml += `
            <div class="andar-item" onclick="toggleAndar(this)">
                <div class="andar-numero">${andar}</div>
                <div class="andar-nome">${salas.join(' • ')}</div>
            </div>
        `;
    }

    content.innerHTML = `
        <p style="color: var(--ios-text-secondary); margin-bottom: 20px; line-height: 1.5;">
            ${data.descricao}
        </p>
        <h4 style="margin-bottom: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-layer-group" style="color: var(--ios-accent-green);"></i>
            Andares e Salas
        </h4>
        <div class="andar-list">
            ${andaresHtml}
        </div>
    `;

    panel.style.display = 'block';
    panel.classList.remove('hidden');

    // Scroll to panel on mobile if requested
    if (scrollToPanel && window.innerWidth <= 768) {
        setTimeout(() => {
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

// Modified closePanel for new location
function closePanel() {
    const panel = document.getElementById('info-panel-section');
    panel.classList.add('hidden');
    setTimeout(() => {
        panel.style.display = 'none';
    }, 300);
    document.querySelectorAll('.building-3d').forEach(b => b.classList.remove('active'));
}

// Modified searchMap to use new searchers
function searchMap() {
    const query = document.getElementById('map-search').value.trim();
    if (!query) return;

    closeSuggestions();

    if (!roomSearcher || !buildingSearcher) {
        initializeSearchers();
    }

    // Try rooms first
    const roomResults = roomSearcher.search(query);
    if (roomResults.length > 0) {
        selectRoom(roomResults[0].item.id);
        return;
    }

    // Then try buildings
    const buildingResults = buildingSearcher.search(query);
    if (buildingResults.length > 0) {
        const buildingId = buildingResults[0].item.id;
        selectBuilding(buildingId);

        // Scroll to building on map
        const element = document.querySelector(`[data-id="${buildingId}"]`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
        return;
    }

    // No results
    showAlert('Nenhum bloco ou sala encontrada para: ' + query, 'error');
}

// Close suggestions when clicking outside
document.addEventListener('click', function(event) {
    const searchContainer = document.querySelector('#map-search').parentElement;
    if (!searchContainer.contains(event.target)) {
        closeSuggestions();
    }
});

// Initialize searchers when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeSearchers();
});