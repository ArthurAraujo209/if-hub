// dashboard.js - Versão com dados carregados do JSON externo

const API_URL = "https://if-hub-backend.onrender.com/api";
const DATA_URL = "./assets/data/salas.json"; // Ajuste se necessário
let dadosGlobais = null;
let dadosAluno = null;
let anoAtual = new Date().getFullYear();

// Essas variáveis agora serão preenchidas após o carregamento do JSON
let roomsDatabase = [];
let buildingData = {};

// ========== VARIÁVEIS GLOBAIS ==========
let fuseRooms, fuseBuildings;
let currentZoom = 1;
let searchTimeout = null;

// ========== CARREGAMENTO DO JSON ==========
async function carregarDadosMapa() {
  try {
    console.log("📥 Carregando dados do mapa...");
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error("Erro ao carregar JSON");
    const dados = await response.json();

    // --- Converter salas para o formato antigo ---
    roomsDatabase = dados.salas.map(sala => ({
      id: sala.id,
      name: sala.nome,
      block: sala.bloco,
      floor: sala.andar,
      room: sala.numero,
      type: sala.tipo,          // será usado no painel de detalhes
      keywords: sala.keywords || []
    }));

    // --- Construir buildingData combinando blocos do JSON com os blocos personalizados ---
    const blocosPersonalizados = {
      1: {
        nome: "Guarita",
        descricao: "Entrada principal",
        andares: { Térreo: ["Portaria"] },
        icon: "shield-alt",
        cor: "var(--ios-accent-blue)",
      },
      4: {
        nome: "Espaço Multiuso",
        descricao: "Atividades diversas",
        andares: { Térreo: ["Ginástica", "Eventos", "Aulas"] },
        icon: "table-tennis",
        cor: "var(--ios-accent-orange)",
      },
      6: {
        nome: "Piscina",
        descricao: "Natação",
        andares: { Externo: ["Piscina"] },
        icon: "swimming-pool",
        cor: "var(--ios-accent-blue)",
      },
      areia: {
        nome: "Quadra de Areia",
        descricao: "Esportes de praia",
        andares: { Externo: ["Vôlei de Praia", "Futevôlei"] },
        icon: "volleyball-ball",
        cor: "var(--ios-accent-orange)",
      },
      quadra: {
        nome: "Quadra Poliesportiva",
        descricao: "Esportes",
        andares: { Externo: ["Basquete", "Futsal", "Handebol", "Banho"] },
        icon: "basketball-ball",
        cor: "var(--ios-accent-orange)",
      },
      "E-ginasio": {
        nome: "Ginásio",
        descricao: "Educação Física",
        andares: {
          Térreo: ["Quadra", "Academia", "Vestiários Masculino", "Vestiários Feminino"]
        },
        icon: "dumbbell",
        cor: "#FF3B30",
      },
      "E-anexo": {
        nome: "Prédio Anexo - Música e Arte",
        descricao: "Laboratórios de Música e Arte",
        andares: {
          "1º Andar": ["Lab. de Música", "Sala de Música"],
          "2º Andar": ["Coord. NUARTE", "Lab. Cenográfico", "Grêmio"]
        },
        icon: "music",
        cor: "#FF3B30",
      },
    };

    // Blocos do JSON (A, B, C, D, E, F)
    const blocosJSON = {};
    for (const [id, bloco] of Object.entries(dados.blocos)) {
      blocosJSON[id] = {
        nome: bloco.nome,
        descricao: bloco.descricao,
        andares: bloco.andares,
        icon: bloco.icon,
        cor: bloco.cor,        // usa a cor hexadecimal do JSON
      };
    }

    // Mescla: os blocos do JSON sobrescrevem os personalizados com mesmo ID (caso existam)
    buildingData = { ...blocosPersonalizados, ...blocosJSON };

    console.log(`✅ ${roomsDatabase.length} salas e ${Object.keys(buildingData).length} blocos carregados.`);
  } catch (error) {
    console.error("❌ Erro ao carregar dados do mapa:", error);
    // Em caso de erro, usa dados de fallback (opcional)
    roomsDatabase = [];
    buildingData = {};
    showAlert("Erro ao carregar mapa. Verifique o arquivo de dados.");
  }
}

// ========== FUNÇÕES DE BUSCA (Fuse) ==========
function initializeFuse() {
  console.log("🔍 Inicializando busca inteligente...");

  const fuseOptions = {
    includeScore: true,
    threshold: 0.4,
    ignoreLocation: true,
    findAllMatches: true,
    minMatchCharLength: 2,
    keys: [
      { name: "name", weight: 2 },
      { name: "keywords", weight: 1.5 },
      { name: "room", weight: 1 },
      { name: "block", weight: 1 },
    ],
  };

  fuseRooms = new Fuse(roomsDatabase, fuseOptions);

  const buildingArray = Object.entries(buildingData).map(([id, data]) => ({
    id: id,
    nome: data.nome,
    descricao: data.descricao,
    icon: data.icon,
    cor: data.cor,
    andares: data.andares,
  }));

  fuseBuildings = new Fuse(buildingArray, {
    includeScore: true,
    threshold: 0.4,
    keys: ["nome", "descricao"],
  });

  console.log("✅ Busca inteligente pronta!");
}

// FUNÇÃO PRINCIPAL DE BUSCA (chamada pelo HTML)
function performSmartSearch() {
  const input = document.getElementById("room-search");
  if (!input) return;

  const query = input.value.trim();

  if (!query || query.length < 2) {
    document.getElementById("autocomplete-suggestions").classList.remove("show");
    return;
  }

  if (!fuseRooms) initializeFuse();

  const roomResults = fuseRooms.search(query);
  const buildingResults = fuseBuildings.search(query);

  const allResults = [
    ...roomResults.map((r) => ({ item: r.item, score: r.score, type: "room" })),
    ...buildingResults.map((b) => ({ item: b.item, score: b.score, type: "building" })),
  ]
    .sort((a, b) => (a.score || 1) - (b.score || 1))
    .slice(0, 8);

  showSuggestions(allResults, query);
}

// Limpar pesquisa
function clearSearch() {
  const input = document.getElementById("room-search");
  if (input) input.value = "";
  document.getElementById("autocomplete-suggestions").classList.remove("show");
  closeResultPanel();
  document.querySelectorAll(".building-3d").forEach((b) => b.classList.remove("active", "highlight"));
}

// Fechar painel de resultados
function closeResultPanel() {
  const container = document.getElementById("search-result-container");
  if (container) {
    container.style.display = "none";
    container.classList.remove("show");
  }
}

// Mostrar sugestões
function showSuggestions(results, query) {
  const container = document.getElementById("autocomplete-suggestions");
  if (!container) return;

  if (results.length === 0) {
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; color: var(--ios-text-secondary);">
        <i class="fas fa-search" style="font-size: 2rem; opacity: 0.5; margin-bottom: 10px;"></i>
        <p>Nenhum resultado para "${escapeHtml(query)}"</p>
        <small>Tente: bibli, lab, 101, cantina...</small>
      </div>
    `;
    container.classList.add("show");
    return;
  }

  let html = "";
  results.forEach((result) => {
    if (result.type === "room") {
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
  container.classList.add("show");
}

// Manipulador de input com debounce
function handleSearchInput() {
  const input = document.getElementById("room-search");
  if (!input) return;

  const query = input.value;

  if (searchTimeout) clearTimeout(searchTimeout);

  if (query.length >= 2) {
    searchTimeout = setTimeout(() => performSmartSearch(), 300);
  } else {
    document.getElementById("autocomplete-suggestions").classList.remove("show");
  }
}

// Selecionar sala
function selectRoom(roomId) {
  const room = roomsDatabase.find((r) => r.id === roomId);
  if (!room) return;

  document.getElementById("autocomplete-suggestions").classList.remove("show");
  document.getElementById("room-search").value = room.name;

  showRoomDetails(room);
  highlightBuilding(room.block);
}

// Selecionar bloco
function selectBuilding(buildingId) {
  const building = buildingData[buildingId];
  if (!building) return;

  document.getElementById("autocomplete-suggestions").classList.remove("show");
  document.getElementById("room-search").value = building.nome;

  showBuildingDetails(buildingId, building);
  highlightBuilding(buildingId);
}

// Mostrar detalhes da sala
function showRoomDetails(room) {
  const container = document.getElementById("search-result-container");
  const title = document.getElementById("search-result-title");
  const content = document.getElementById("search-result-content");

  if (!container) return;

  title.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <i class="fas fa-door-open" style="color: var(--ios-accent-green);"></i>
        <span>${room.name}</span>
        <span style="background: var(--gradient-primary); padding: 4px 12px; border-radius: 20px; font-size: 0.8rem;">Bloco ${room.block}</span>
      </div>
      <button onclick="closeResultPanel()" class="close-panel" style="background: rgba(255,255,255,0.1); border: none; color: white; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;">
        <i class="fas fa-times"></i>
      </button>
    </div>
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
    <button class="ios-btn result-action-btn" onclick="resetMap()" style="margin-top: 20px;">
      <i class="fas fa-sync-alt"></i> Resetar Visualização
    </button>
  `;

  container.style.display = "block";
  container.classList.add("show");
  container.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Mostrar detalhes do bloco
function showBuildingDetails(buildingId, building) {
  const container = document.getElementById("search-result-container");
  const title = document.getElementById("search-result-title");
  const content = document.getElementById("search-result-content");

  if (!container) return;

  title.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <i class="fas fa-${building.icon}" style="color: ${building.cor};"></i>
        <span>${building.nome}</span>
      </div>
      <button onclick="closeResultPanel()" class="close-panel" style="background: rgba(255,255,255,0.1); border: none; color: white; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;

  let andaresHtml = "";
  for (const [andar, salas] of Object.entries(building.andares)) {
    andaresHtml += `
      <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; margin-bottom: 10px;">
        <div style="font-weight: 600; color: var(--ios-accent-green); margin-bottom: 5px;">${andar}</div>
        <div style="color: var(--ios-text-secondary);">${salas.join(" • ")}</div>
      </div>
    `;
  }

  content.innerHTML = `
    <p style="color: var(--ios-text-secondary); margin-bottom: 20px;">${building.descricao}</p>
    <h4 style="margin-bottom: 15px;">Andares</h4>
    ${andaresHtml}
    <button class="ios-btn result-action-btn" onclick="resetMap()" style="margin-top: 20px;">
      <i class="fas fa-sync-alt"></i> Resetar Visualização
    </button>
  `;

  container.style.display = "block";
  container.classList.add("show");
  container.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Destacar bloco no mapa
function highlightBuilding(buildingId) {
  document.querySelectorAll(".building-3d").forEach((b) => b.classList.remove("active", "highlight"));
  const building = document.querySelector(`[data-id="${buildingId}"]`);
  if (building) building.classList.add("active", "highlight");
}

// Funções de zoom
function zoomMap(factor) {
  currentZoom *= factor;
  currentZoom = Math.max(0.5, Math.min(3, currentZoom));
  const image = document.getElementById("campus-image");
  if (image) image.style.transform = `scale(${currentZoom})`;
}

function resetMap() {
  currentZoom = 1;
  const image = document.getElementById("campus-image");
  if (image) image.style.transform = "scale(1)";

  document.querySelectorAll(".building-3d").forEach((b) => b.classList.remove("active", "highlight"));

  const container = document.getElementById("search-result-container");
  if (container) {
    container.style.display = "none";
    container.classList.remove("show");
  }

  const input = document.getElementById("room-search");
  if (input) input.value = "";

  document.getElementById("autocomplete-suggestions").classList.remove("show");
}

// Filtrar por categoria (chamado pelos quick links)
function filterByCategory(category) {
  const searchInput = document.getElementById("room-search");
  if (!searchInput) return;
  
  // Mapeia categorias para termos de busca
  const categoryMap = {
    'lab': 'laboratório',
    'biblioteca': 'biblioteca',
    'esporte': 'quadra ginásio',
    'alimentacao': 'cantina refeitório'
  };
  
  searchInput.value = categoryMap[category] || category;
  performSmartSearch();
}

// Utilitários
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);
  try {
    const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
    return escapeHtml(text).replace(regex, '<mark style="background: rgba(48,209,88,0.3); padding: 2px; border-radius: 3px;">$1</mark>');
  } catch (e) {
    return escapeHtml(text);
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ========== FUNÇÕES ORIGINAIS ==========

function safeArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.results && Array.isArray(data.results)) return data.results;
  if (typeof data === "object") return [data];
  return [];
}

function safeObject(data) {
  if (!data) return {};
  if (typeof data === "object" && !Array.isArray(data)) return data;
  return {};
}

function parseHorario(codigo) {
  if (!codigo || codigo.length < 3) return null;

  const dia = parseInt(codigo[0]);
  const turno = codigo[1];
  const horas = codigo
    .substring(2)
    .split("")
    .map((h) => parseInt(h));

  const diasNomes = ["", "Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const turnosNomes = { M: "Manhã", V: "Tarde", N: "Noite" };

  return {
    dia,
    diaNome: diasNomes[dia] || "",
    turno,
    turnoNome: turnosNomes[turno] || turno,
    horas,
    horasStr: horas.join("ª, ") + "ª",
  };
}

// --- CONFIGURAÇÕES TÉCNICAS DO MENU ---
const indicator = document.getElementById('navIndicator');
const menuItems = document.querySelectorAll('.mobile-menu-item');
let isHolding = false;
let holdTimer;

// Função para mover a bolha
function updateIndicator(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuRect = el.parentElement.getBoundingClientRect();
    
    // Calcula a posição X
    const left = rect.left - menuRect.left;
    
    // 1. Atualiza a largura
    indicator.style.width = `${rect.width}px`;
    
    // 2. O SEGREDO: Em vez de style.transform, mudamos a Variável CSS
    indicator.style.setProperty('--x', `${left}px`);
}

// Inicializa no carregamento
window.addEventListener('load', () => {
    const activeItem = document.querySelector('.mobile-menu-item.active');
    if (activeItem) updateIndicator(activeItem);
});

// --- FUNÇÃO DE NAVEGAÇÃO COMPLETA (Original + Efeito) ---
function showSection(sectionName, event) {
    // 1. Previne comportamento padrão se for chamado por evento
    if (event) {
        event.preventDefault();
    }

    // 2. Menu Mobile (bolha)
    menuItems.forEach((item) => item.classList.remove("active"));
    
    let activeItem;
    if (event && event.currentTarget && event.currentTarget.classList.contains('mobile-menu-item')) {
        activeItem = event.currentTarget;
    } else {
        // Encontra o item pelo nome da seção se vier do drag
        activeItem = Array.from(menuItems).find(item => 
            item.getAttribute("onclick") && item.getAttribute("onclick").includes(sectionName)
        );
    }

    if (activeItem) {
        activeItem.classList.add("active");
        updateIndicator(activeItem); // Move a bolha
    }

    // 3. Atualiza sidebar (links principais)
    document.querySelectorAll(".sidebar .nav-link").forEach(link => link.classList.remove("active"));
    const sidebarLink = Array.from(document.querySelectorAll(".sidebar .nav-link")).find(link => {
        const onclick = link.getAttribute("onclick");
        return onclick && onclick.includes(sectionName);
    });
    if (sidebarLink) sidebarLink.classList.add("active");

    // 4. Atualiza header-nav
    document.querySelectorAll(".header-nav-link").forEach(link => link.classList.remove("active"));
    const headerLink = Array.from(document.querySelectorAll(".header-nav-link")).find(link => {
        const onclick = link.getAttribute("onclick");
        return onclick && onclick.includes(sectionName);
    });
    if (headerLink) headerLink.classList.add("active");

    // 5. Troca de Seções e Títulos (Sua lógica original)
    document.querySelectorAll(".content-section").forEach((s) => s.classList.remove("active"));
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) targetSection.classList.add("active");

    const titles = {
        dashboard: '<i class="fas fa-home"></i> Dashboard',
        boletim: '<i class="fas fa-file-alt"></i> Boletim',
        horarios: '<i class="fas fa-clock"></i> Horários',
        turmas: '<i class="fas fa-users"></i> Turmas',
        mapa: '<i class="fas fa-map-marked-alt"></i> Mapa do Campus',
        avaliacoes: '<i class="fas fa-clipboard-list"></i> Avaliações',
        periodos: '<i class="fas fa-calendar-alt"></i> Períodos',
        perfil: '<i class="fas fa-user"></i> Perfil',
    };
    const pageTitle = document.getElementById("page-title");
    if (pageTitle) pageTitle.innerHTML = titles[sectionName] || titles["dashboard"];

    // Fecha sidebar no mobile se estiver aberta
    if (window.innerWidth <= 1024) {
        closeSidebar();
    }
}

// --- LÓGICA DE GESTO "HOLD & DRAG" (Refinado) ---
// --- LÓGICA DE GESTO "HOLD & DRAG" (Refinado e Otimizado) ---
let draggedOverItem = null;

menuItems.forEach(item => {
    item.addEventListener('touchstart', (e) => {
        // Tempo ligeiramente maior para considerar o segurar (350ms)
        holdTimer = setTimeout(() => {
            isHolding = true;
            indicator.classList.add('holding'); // Bolha infla e ganha refração
            if (navigator.vibrate) navigator.vibrate([15]); // Vibração rápida
            draggedOverItem = null; // reseta ao iniciar novo arraste
        }, 350);
    });

    item.addEventListener('touchend', () => {
        clearTimeout(holdTimer);
        
        // Se estava segurando e passou por algum item, ativa a seção correspondente
        if (isHolding && draggedOverItem) {
            const onclickAttr = draggedOverItem.getAttribute('onclick');
            if (onclickAttr) {
                const section = onclickAttr.match(/'([^']+)'/)[1];
                showSection(section);
                if (navigator.vibrate) navigator.vibrate(10); // feedback tátil de confirmação
            }
        }
        
        // Reset do estado
        isHolding = false;
        indicator.classList.remove('holding'); // Bolha volta ao normal
        draggedOverItem = null;
    });

    item.addEventListener('touchmove', (e) => {
        if (isHolding) {
            const touch = e.touches[0];
            // Detecta onde o dedo está passando
            const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
            const menuBtn = targetEl?.closest('.mobile-menu-item');

            if (menuBtn) {
                draggedOverItem = menuBtn;
                // Apenas move a bolha, NÃO troca de seção
                updateIndicator(menuBtn);
            }
        }
    }, { passive: true });
});

// --- Função para toggle da sidebar no desktop ---
function toggleSidebarDesktop() {
    const sidebar = document.getElementById("sidebar");
    const mainContent = document.getElementById("mainContent");
    sidebar.classList.toggle("sidebar-collapsed");
    mainContent.classList.toggle("expanded");
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const icon = document.getElementById("menu-toggle-icon");

  sidebar.classList.toggle("open");
  if (sidebar.classList.contains("open")) {
    overlay.style.display = "block";
    icon.classList.remove("fa-bars");
    icon.classList.add("fa-arrow-left");
  } else {
    overlay.style.display = "none";
    icon.classList.remove("fa-arrow-left");
    icon.classList.add("fa-bars");
  }
}

function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const icon = document.getElementById("menu-toggle-icon");

  sidebar.classList.remove("open");
  overlay.style.display = "none";
  icon.classList.remove("fa-arrow-left");
  icon.classList.add("fa-bars");
}

async function logout() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (e) {}
  localStorage.removeItem("suap_token");
  window.location.href = "/index.html";
}

function showAlert(message, type = "error") {
  const container = document.getElementById("alert-container");
  if (!container) return;

  const icon = type === "error" ? "exclamation-circle" : "check-circle";
  const className = type === "error" ? "alert-error" : "alert-success";

  container.innerHTML = `
        <div class="ios-alert ${className}">
            <i class="fas fa-${icon}"></i>
            <span style="font-weight: 500;">${message}</span>
        </div>
    `;
  setTimeout(() => (container.innerHTML = ""), 5000);
}

function mostrarLoading() {
  const loadingEl = document.getElementById("loading");
  if (loadingEl) loadingEl.style.display = "flex";
}

function esconderLoading() {
  const loadingEl = document.getElementById("loading");
  if (loadingEl) loadingEl.style.display = "none";
}

async function trocarAno(novoAno) {
  anoAtual = parseInt(novoAno);
  mostrarLoading();
  await carregarDadosAno(anoAtual);
  esconderLoading();
}

async function carregarDadosAluno() {
  const token = localStorage.getItem("suap_token");
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  try {
    const response = await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      localStorage.removeItem("suap_token");
      window.location.href = "/index.html";
      return;
    }

    const data = await response.json();
    dadosAluno = data.aluno;

    preencherSidebar({ aluno: dadosAluno });
    preencherPerfil({ aluno: dadosAluno });
  } catch (error) {
    console.error("Erro ao carregar dados do aluno:", error);
  }
}

async function carregarDadosAno(ano) {
  const token = localStorage.getItem("suap_token");
  if (!token) return;

  try {
    const response = await fetch(`${API_URL}/dashboard/${ano}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      localStorage.removeItem("suap_token");
      showAlert("Sessão expirada. Faça login novamente.");
      setTimeout(() => (window.location.href = "/index.html"), 2000);
      return;
    }

    const data = await response.json();

    dadosGlobais = {
      ...data,
      aluno: dadosAluno,
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
    console.error("Erro:", error);
    showAlert("Erro ao carregar dados: " + error.message);
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
  const nome = aluno.nome_usual || aluno.nome || "Aluno";
  const matricula = aluno.matricula || "";
  const foto = aluno.foto || aluno.url_foto_75x100;

  const nomeEl = document.getElementById("sidebar-nome");
  const matriculaEl = document.getElementById("sidebar-matricula");

  if (nomeEl) nomeEl.textContent = nome;
  if (matriculaEl) matriculaEl.textContent = matricula;

  const avatarEl = document.getElementById("sidebar-avatar");
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
  const boletim = safeArray(data.boletim);

  const cardIra = document.getElementById("card-ira");
  const cardFrequencia = document.getElementById("card-frequencia");
  const cardFaltas = document.getElementById("card-faltas");

  if (cardIra) cardIra.textContent = aluno.ira || "--";

  // Frequência - Média das porcentagens de frequência
  if (cardFrequencia) {
    let totalFreq = 0;
    let count = 0;
    boletim.forEach(d => {
      const freq = parseFloat(d.percentual_carga_horaria_frequentada);
      if (!isNaN(freq)) {
        totalFreq += freq;
        count++;
      }
    });
    const mediaFreq = count > 0 ? (totalFreq / count).toFixed(1) + '%' : '--';
    cardFrequencia.textContent = mediaFreq;
  }

  // Total de Faltas
  if (cardFaltas) {
    const totalFaltas = boletim.reduce((sum, d) => sum + (parseInt(d.numero_faltas) || 0), 0);
    cardFaltas.textContent = totalFaltas;
  }

  const containerAval = document.getElementById("dashboard-avaliacoes");

  let avaliacoes = [];
  if (data.avaliacoes) {
    const proximas = safeArray(data.avaliacoes.proximas);
    avaliacoes = proximas;
  }

  if (containerAval) {
    if (avaliacoes.length === 0) {
      containerAval.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <p>Nenhuma avaliação agendada</p>
                </div>
            `;
    } else {
      containerAval.innerHTML = avaliacoes
        .slice(0, 3)
        .map(
          (av) => `
                <div class="timeline-item" style="margin-bottom: 16px;">
                    <div class="timeline-date"><i class="fas fa-clock"></i> ${formatarData(av.data)}</div>
                    <div class="timeline-title">${av.descricao || "Avaliação"}</div>
                    <div class="timeline-desc">${av.diario || av.componente_curricular || ""}</div>
                </div>
            `,
        )
        .join("");
    }
  }

  const containerBoletim = document.getElementById("dashboard-boletim-resumo");
  if (containerBoletim) {
    if (boletim.length === 0) {
      containerBoletim.innerHTML = `<div class="empty-state"><i class="fas fa-file-alt"></i><p>Nenhuma disciplina</p></div>`;
    } else {
      const html = boletim
        .slice(0, 5)
        .map((d) => {
          const media =
            parseFloat(d.media_final_disciplina) ||
            parseFloat(d.media_disciplina) ||
            0;
          let situacaoClass = "tag-cursando";
          if (d.situacao === "Aprovado") situacaoClass = "tag-aprovado";
          else if (d.situacao === "Reprovado") situacaoClass = "tag-reprovado";

          return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 18px; background: rgba(255,255,255,0.03); border-radius: 16px; margin-bottom: 12px; border: 1px solid var(--glass-border);">
                        <div>
                            <div style="font-weight: 600; margin-bottom: 4px;">${d.disciplina || "Disciplina"}</div>
                            <div style="font-size: 0.85rem; color: var(--ios-text-secondary);">Média: ${media || "--"}</div>
                        </div>
                        <span class="situacao-badge ${situacaoClass}">${d.situacao || "Cursando"}</span>
                    </div>
                `;
        })
        .join("");
      containerBoletim.innerHTML = html;
    }
  }

  // Preenche horários de hoje
  preencherHorariosHoje(data);
}

// NOVA FUNÇÃO: Preencher o painel de horários de hoje
function preencherHorariosHoje(data) {
  const container = document.getElementById("dashboard-horarios-hoje");
  if (!container) return;

  const hoje = new Date();
  const diaSemana = hoje.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado

  // Se for sábado ou domingo, exibir mensagem
  if (diaSemana === 0) { // domingo
    container.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <i class="fas fa-sun" style="font-size: 2.5rem;"></i>
        <p style="font-size: 1.1rem; margin: 10px 0;">Domingo é dia de descanso! 🛌</p>
        <small style="color: var(--ios-text-secondary);">Amanhã (segunda) você tem aulas normalmente.</small>
      </div>
    `;
    return;
  }
  if (diaSemana === 6) { // sábado
    container.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <i class="fas fa-couch" style="font-size: 2.5rem;"></i>
        <p style="font-size: 1.1rem; margin: 10px 0;">Sábado, dia de relaxar! 🎉</p>
        <small style="color: var(--ios-text-secondary);">Aproveite o fim de semana.</small>
      </div>
    `;
    return;
  }

  // Dia de semana (segunda a sexta)
  const turmas = safeArray(data.turmas);
  const horariosHoje = [];

  turmas.forEach(turma => {
    if (turma.horarios_de_aula) {
      const codigos = turma.horarios_de_aula.split(" / ");
      codigos.forEach(cod => {
        const parsed = parseHorario(cod.trim());
        // parsed.dia: 1=domingo,2=segunda,...7=sábado
        if (parsed && parsed.dia === diaSemana + 1) { // +1 porque no array o índice 1 é domingo
          horariosHoje.push({
            ...parsed,
            disciplina: turma.descricao,
            sigla: turma.sigla,
            local: turma.locais_de_aula?.[0] || "Local não definido",
          });
        }
      });
    }
  });

  if (horariosHoje.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <i class="fas fa-calendar-day"></i>
        <p>Nenhuma aula hoje</p>
      </div>
    `;
    return;
  }

  // Ordenar por turno e hora
  const ordemTurno = { M: 1, V: 2, N: 3 };
  horariosHoje.sort((a, b) => {
    if (ordemTurno[a.turno] !== ordemTurno[b.turno]) return ordemTurno[a.turno] - ordemTurno[b.turno];
    return a.horas[0] - b.horas[0];
  });

  let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
  horariosHoje.forEach(aula => {
    const tagClass = { M: "tag-manha", V: "tag-tarde", N: "tag-noite" }[aula.turno] || "tag-manha";
    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 16px; border-radius: 16px; border-left: 4px solid var(--ios-accent-green);">
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">${aula.disciplina}</div>
          <div style="font-size: 0.85rem; color: var(--ios-text-secondary);"><i class="fas fa-map-marker-alt"></i> ${aula.local}</div>
        </div>
        <span class="aula-tag ${tagClass}" style="font-size: 0.7rem;">${aula.turnoNome} (${aula.horasStr})</span>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

function preencherPerfil(data) {
  const aluno = safeObject(data.aluno);
  const nome = aluno.nome_usual || aluno.nome || "Aluno";
  const foto = aluno.foto || aluno.url_foto_75x100;

  const nomeEl = document.getElementById("perfil-nome");
  const matriculaEl = document.getElementById("perfil-matricula");
  const emailEl = document.getElementById("perfil-email");

  if (nomeEl) nomeEl.textContent = nome;
  if (matriculaEl) matriculaEl.textContent = aluno.identificacao || "--";
  if (emailEl)
    emailEl.textContent = aluno.email_academico || aluno.email || "--";

  const avatarEl = document.getElementById("perfil-avatar");
  if (avatarEl) {
    if (foto) {
      avatarEl.innerHTML = `<img src="${foto}" alt="Foto" onerror="this.parentElement.innerHTML='<span id=\'perfil-avatar-text\'>${nome.charAt(0)}</span>'">`;
    } else {
      avatarEl.innerHTML = `<span id="perfil-avatar-text">${nome.charAt(0).toUpperCase()}</span>`;
    }
  }

  const detalhesEl = document.getElementById("perfil-detalhes");
  if (detalhesEl) {
    const campos = [
      { label: "Nome Completo", value: aluno.nome || aluno.nome_registro },
      { label: "Nome Usual", value: aluno.nome_usual },
      { label: "Matrícula", value: aluno.matricula },
      { label: "CPF", value: aluno.cpf },
      { label: "E-mail Acadêmico", value: aluno.email_academico },
      { label: "Curso", value: aluno.curso },
      { label: "Campus", value: aluno.campus },
      { label: "Situação", value: aluno.situacao },
      { label: "IRA", value: aluno.ira },
      { label: "Ano de Ingresso", value: aluno.ingresso },
    ];

    detalhesEl.innerHTML = campos
      .filter((c) => c.value)
      .map(
        (c) => `
                <div class="info-row">
                    <span class="info-label" style="font-size: 0.875rem;">${c.label}</span>
                    <span class="info-value" style="font-size: 0.875rem;">${c.value}</span>
                </div>
            `,
      )
      .join("");
  }
}

function preencherPeriodos(data) {
  const periodos = safeArray(data.periodos);
  const container = document.getElementById("periodos-grid");

  const anos = [...new Set(periodos.map((p) => p.ano_letivo))].sort(
    (a, b) => b - a,
  );

  const headerSelect = document.getElementById("ano-select");
  if (headerSelect) {
    headerSelect.innerHTML = anos
      .map(
        (ano) =>
          `<option value="${ano}" ${ano === anoAtual ? "selected" : ""}>${ano}</option>`,
      )
      .join("");
  }

  if (container) {
    if (anos.length === 0) {
      container.innerHTML =
        '<p style="color: var(--ios-text-secondary); text-align: center; padding: 40px;">Nenhum período encontrado</p>';
    } else {
      container.innerHTML = anos
        .map(
          (ano) => `
                <div class="periodo-card ${ano === anoAtual ? "active" : ""}" onclick="trocarAno(${ano})">
                    <div class="periodo-ano">${ano}</div>
                    <div class="periodo-status">${ano === anoAtual ? "Período Atual" : "Clique para visualizar"}</div>
                </div>
            `,
        )
        .join("");
    }
  }
}

function preencherBoletim(data) {
  const boletim = safeArray(data.boletim);
  const container = document.getElementById("boletim-content");
  if (!container) return;

  if (boletim.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-file-alt"></i><p>Nenhuma disciplina encontrada</p></div>`;
    return;
  }

  const html = `
        <div class="table-responsive">
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
                  ${boletim
                    .map((d) => {
                      const n1 = d.nota_etapa_1?.nota || "--";
                      const n2 = d.nota_etapa_2?.nota || "--";
                      const n3 = d.nota_etapa_3?.nota || "--";
                      const n4 = d.nota_etapa_4?.nota || "--";
                      const media =
                        d.media_disciplina || d.media_final_disciplina || "--";
                      const n1Num = parseFloat(n1) || 0;
                      const n2Num = parseFloat(n2) || 0;
                      const n3Num = parseFloat(n3) || 0;
                      const n4Num = parseFloat(n4) || 0;
                      let situacaoClass = "tag-cursando";
                      if (d.situacao === "Aprovado")
                        situacaoClass = "tag-aprovado";
                      else if (d.situacao === "Reprovado")
                        situacaoClass = "tag-reprovado";
                      return `
                          <tr>
                              <td>
                                  <div class="disciplina-info">
                                      <h4>${d.disciplina || "Disciplina"}</h4>
                                      <p>Faltas: ${d.numero_faltas || 0} | Freq: ${d.percentual_carga_horaria_frequentada || 0}%</p>
                                  </div>
                              </td>
                              <td style="text-align: center;"><span class="nota-badge ${n1Num >= 60 ? "nota-aprovado" : n1Num >= 40 ? "nota-recuperacao" : "nota-reprovado"}">${n1}</span></td>
                              <td style="text-align: center;"><span class="nota-badge ${n2Num >= 60 ? "nota-aprovado" : n2Num >= 40 ? "nota-recuperacao" : "nota-reprovado"}">${n2}</span></td>
                              <td style="text-align: center;"><span class="nota-badge ${n3Num >= 60 ? "nota-aprovado" : n3Num >= 40 ? "nota-recuperacao" : "nota-reprovado"}">${n3}</span></td>
                              <td style="text-align: center;"><span class="nota-badge ${n4Num >= 60 ? "nota-aprovado" : n4Num >= 40 ? "nota-recuperacao" : "nota-reprovado"}">${n4}</span></td>
                              <td style="text-align: center; font-weight: 700; font-size: 1.1rem;">${media}</td>
                              <td style="text-align: center;"><span class="situacao-badge ${situacaoClass}">${d.situacao || "Cursando"}</span></td>
                          </tr>
                      `;
                    })
                    .join("")}
              </tbody>
          </table>
        </div>
    `;

  container.innerHTML = html;
}

function preencherHorarios(data) {
  const turmas = safeArray(data.turmas);
  const container = document.getElementById("horarios-content");
  if (!container) return;

  const horariosParseados = [];
  turmas.forEach((turma) => {
    if (turma.horarios_de_aula) {
      const codigos = turma.horarios_de_aula.split(" / ");
      codigos.forEach((cod) => {
        const parsed = parseHorario(cod.trim());
        if (parsed) {
          horariosParseados.push({
            ...parsed,
            disciplina: turma.descricao,
            sigla: turma.sigla,
            local: turma.locais_de_aula?.[0] || "Local não definido",
          });
        }
      });
    }
  });

  if (horariosParseados.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-clock"></i><p>Nenhum horário encontrado</p></div>`;
    return;
  }

  const diasSemana = {
    2: "Segunda-feira",
    3: "Terça-feira",
    4: "Quarta-feira",
    5: "Quinta-feira",
    6: "Sexta-feira",
  };

  let html = "<div>";

  [2, 3, 4, 5, 6].forEach((dia) => {
    const aulasDia = horariosParseados.filter((h) => h.dia === dia);

    if (aulasDia.length > 0) {
      html += `<div class="dia-card">`;
      html += `<div class="dia-header"><i class="fas fa-calendar-day"></i> ${diasSemana[dia]}</div>`;

      const ordemTurno = { M: 1, V: 2, N: 3 };
      aulasDia.sort((a, b) => {
        if (ordemTurno[a.turno] !== ordemTurno[b.turno]) {
          return ordemTurno[a.turno] - ordemTurno[b.turno];
        }
        return a.horas[0] - b.horas[0];
      });

      aulasDia.forEach((aula) => {
        const tagClass =
          { M: "tag-manha", V: "tag-tarde", N: "tag-noite" }[aula.turno] ||
          "tag-manha";

        html += `
                    <div class="aula-card">
                        <div class="aula-info">
                            <h4>${aula.disciplina}</h4>
                            <p><i class="fas fa-map-marker-alt"></i> ${aula.local.split(" - ")[0]}</p>
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

      html += "</div>";
    }
  });

  html += "</div>";
  container.innerHTML = html;
}

function preencherTurmas(data) {
  const turmas = safeArray(data.turmas);
  const container = document.getElementById("turmas-content");
  if (!container) return;

  if (turmas.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><p>Nenhuma turma encontrada</p></div>`;
    return;
  }

  container.innerHTML = turmas
    .map((t) => {
      const horarios = t.horarios_de_aula
        ? t.horarios_de_aula.split(" / ")
        : [];
      const horariosHtml = horarios
        .map((h) => {
          const parsed = parseHorario(h.trim());
          if (parsed) {
            return `<span style="background: rgba(48, 209, 88, 0.15); color: var(--ios-accent-green); padding: 4px 12px; border-radius: 8px; font-size: 0.75rem; margin-right: 6px; border: 1px solid rgba(48, 209, 88, 0.3); font-weight: 600;">${parsed.diaNome} - ${parsed.turnoNome}</span>`;
          }
          return "";
        })
        .join("");

      return `
            <div class="turma-item">
                <span class="turma-badge">${t.sigla || "---"}</span>
                <div class="turma-nome">${t.descricao || "Disciplina"}</div>
                ${t.observacao ? `<div style="font-size: 0.9rem; color: var(--ios-accent-orange); margin-bottom: 12px;"><i class="fas fa-info-circle"></i> ${t.observacao}</div>` : ""}
                <div style="margin-bottom: 12px;">${horariosHtml}</div>
                <div class="turma-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${t.locais_de_aula?.[0]?.split(" - ")[0] || "Local não definido"}</span>
                </div>
            </div>
        `;
    })
    .join("");
}

function preencherAvaliacoes(data) {
    // Próximas avaliações
    const containerProximas = document.getElementById("avaliacoes-content");
    if (containerProximas) {
        console.log("DEBUG - Avaliações recebidas:", data.avaliacoes);
        
        let proximas = [];
        if (data.avaliacoes && data.avaliacoes.proximas) {
            proximas = safeArray(data.avaliacoes.proximas);
        }
        
        console.log("DEBUG - Próximas processadas:", proximas);

        if (proximas.length === 0) {
            containerProximas.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <p>Nenhuma avaliação agendada</p>
                    <small>As avaliações aparecerão aqui quando forem marcadas</small>
                </div>
            `;
        } else {
            containerProximas.innerHTML = proximas.map(av => `
                <div class="timeline-item" style="margin-bottom: 16px; padding: 20px; background: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid var(--glass-border);">
                    <div class="timeline-date" style="color: var(--ios-accent-green); font-weight: 600; margin-bottom: 8px;">
                        <i class="fas fa-clock"></i> ${formatarData(av.data)} ${av.hora_inicio ? `às ${av.hora_inicio}` : ''}
                    </div>
                    <div class="timeline-title" style="font-size: 1.1rem; font-weight: 600; margin-bottom: 4px;">
                        ${av.descricao || av.tipo || "Avaliação"}
                    </div>
                    <div class="timeline-desc" style="color: var(--ios-text-secondary);">
                        ${av.componente_curricular || av.diario || "Disciplina não informada"}
                    </div>
                    ${av.nota_maxima ? `<div style="margin-top: 8px; font-size: 0.9rem; color: var(--ios-accent-orange);"><i class="fas fa-star"></i> Valor máximo: ${av.nota_maxima}</div>` : ''}
                </div>
            `).join("");
        }
    }

    // Histórico de avaliações - ORDENADO POR ETAPA
    const containerHistorico = document.getElementById("avaliacoes-historico-content");
    if (containerHistorico && data.avaliacoes && data.avaliacoes.historico) {
        let historico = safeArray(data.avaliacoes.historico);
        
        // 🔥 ORDENAÇÃO: Primeiro por Etapa (1→4), depois por Disciplina
        historico.sort((a, b) => {
            // Ordena por etapa primeiro
            if (a.etapa !== b.etapa) {
                return a.etapa - b.etapa;
            }
            // Se mesma etapa, ordena por disciplina alfabeticamente
            return (a.disciplina || "").localeCompare(b.disciplina || "");
        });
        
        // Agrupa por Etapa para visualização melhor
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
                </div>
            `;
        } else {
            // Renderiza agrupado por etapa
            let html = '';
            
            // Ordem das etapas: 1, 2, 3, 4
            [1, 2, 3, 4].forEach(etapa => {
                if (porEtapa[etapa]) {
                    html += `
                        <div style="margin-bottom: 24px;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--glass-border);">
                                <span style="background: var(--gradient-primary); padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 700;">
                                    ${etapa}ª Etapa
                                </span>
                                <span style="color: var(--ios-text-secondary); font-size: 0.9rem;">
                                    ${porEtapa[etapa].length} avaliação(ões)
                                </span>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                    `;
                    
                    html += porEtapa[etapa].map(av => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid var(--glass-border); transition: all 0.2s;">
                            <div style="flex: 1;">
                                <div style="font-weight: 600; font-size: 1rem; margin-bottom: 4px;">${av.disciplina}</div>
                                <div style="font-size: 0.8rem; color: var(--ios-text-secondary);">
                                    ${av.codigo_diario || ''}
                                </div>
                            </div>
                            <div style="text-align: right; margin-left: 16px;">
                                <span class="nota-badge ${parseFloat(av.nota) >= 60 ? 'nota-aprovado' : parseFloat(av.nota) >= 40 ? 'nota-recuperacao' : 'nota-reprovado'}" style="font-size: 1.1rem; padding: 8px 16px;">
                                    ${av.nota !== null && av.nota !== undefined ? av.nota : '-'}
                                </span>
                            </div>
                        </div>
                    `).join('');
                    
                    html += `</div></div>`;
                }
            });
            
            containerHistorico.innerHTML = html;
        }
    }
}

function formatarData(dataStr) {
  if (!dataStr) return "Data não definida";

  try {
    const [ano, mes, dia] = dataStr.split("T")[0].split("-");
    const data = new Date(ano, mes - 1, dia);

    return data.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch (e) {
    return dataStr;
  }
}

function mudarPeriodoBoletim() {}


// ==========================================
// NOTIFICAÇÕES FIREBASE
// ==========================================

const messaging = firebase.messaging();

// Toast simples (se não existir)
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
    console.log('🔔 Iniciando Firebase...');
    
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showToast('⚠️ Permissão negada');
      return;
    }

    // COLE SUA VAPID KEY AQUI! (da seção Web Push certificates no Firebase)
    const vapidKey = 'BOamnGvNvE8HipXDCIasCWMlIzI1sWS1ONqG8ZXp0RUwsyJuxT1zjSB2vKaLHwVP45Bhl5SWoJKlraRNTvbAH_o'; // ← SUBSTITUA PELA SUA CHAVE!
    
    console.log('⏳ Obtendo token com VAPID:', vapidKey.substring(0, 10) + '...');

    const token = await messaging.getToken({ vapidKey });

    if (!token) {
      showToast('❌ Erro ao obter token');
      return;
    }

    console.log('✅ FCM Token:', token.substring(0, 30) + '...');

    // Enviar para backend
    const suapToken = localStorage.getItem('suap_token');
    const response = await fetch(`${API_URL}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${suapToken}`
      },
      body: JSON.stringify({ fcmToken: token, token: suapToken })
    });

    if (!response.ok) {
      throw new Error('Erro ao registrar no servidor');
    }

    showToast('🔔 Notificações ativadas!');
    updateNotificationUI(true);

    // Listener para mensagens em foreground
    messaging.onMessage((payload) => {
      console.log('📨 Foreground:', payload);
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: payload.notification.icon || '/assets/icons/IF HUB - SEM FUNDO - 192x192.png'
      });
    });

  } catch (err) {
    console.error('❌ Erro Firebase:', err);
    showToast('❌ Erro: ' + err.message);
  }
}

async function checkNotificationStatus() {
  try {
    const permission = Notification.permission;
    if (permission !== 'granted') {
      updateNotificationUI(false);
      return;
    }

    const token = await messaging.getToken();
    updateNotificationUI(!!token);
    
  } catch (err) {
    updateNotificationUI(false);
  }
}

async function unsubscribeNotifications() {
  try {
    await messaging.deleteToken();
    
    const token = localStorage.getItem('suap_token');
    await fetch(`${API_URL}/notifications/unsubscribe`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ token })
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

// Verifica se a tela é menor ou igual a 1024px (celulares e tablets)
if (window.innerWidth <= 1024) {
    
    // 1. Desativa o menu de contexto (clique longo no celular)
    window.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    }, false);

    // 2. Proteção para imagens
    // Bloqueia mousedown (PC simulando mobile) e dragstart (arraste nativo)
    document.querySelectorAll('img').forEach(img => {
        // Evita que a imagem seja "puxada"
        img.addEventListener('dragstart', e => e.preventDefault());
        // Evita o menu ao segurar em navegadores que não respeitam o contextmenu
        img.addEventListener('mousedown', e => e.preventDefault());
    });
}


// ========== INICIALIZAÇÃO ==========
document.addEventListener("DOMContentLoaded", async function () {
  console.log("🚀 Inicializando aplicação...");

  // Carrega dados acadêmicos primeiro (seus dados do aluno)
  carregarDados();

  // Carrega dados do mapa (salas e blocos) e depois inicializa a busca
  await carregarDadosMapa();
  initializeFuse();

  // Verifica status das notificações
  setTimeout(checkNotificationStatus, 1000);

  // Registra funções globais
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
  window.initNotifications = initNotifications;
  window.unsubscribeNotifications = unsubscribeNotifications;
  window.clearSearch = clearSearch;
  window.closeResultPanel = closeResultPanel;
  window.filterByCategory = filterByCategory;
  window.toggleSidebarDesktop = toggleSidebarDesktop; // nova função

  console.log("✅ Sistema pronto!");
});