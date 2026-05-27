/**
 * admin-campus-modal.js - Interface modal para gerenciar campus e features
 */

export function criarModalCampus() {
  const modal = document.createElement('div');
  modal.id = 'modal-campus';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: none;
    z-index: 10000;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;

  modal.innerHTML = `
    <div style="
      background: var(--bg2);
      border-radius: 16px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      color: var(--text);
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 id="modal-titulo">Editar Campus</h2>
        <button onclick="fecharModalCampus()" style="
          background: none;
          border: none;
          color: var(--text2);
          font-size: 24px;
          cursor: pointer;
        ">×</button>
      </div>

      <div id="modal-conteudo"></div>
    </div>
  `;

  document.body.appendChild(modal);
  window.abrirModalCampus = abrirModalCampus;
  window.fecharModalCampus = fecharModalCampus;
  window.salvarCampusModal = salvarCampusModal;
}

function abrirModalCampus(campus) {
  const modal = document.getElementById('modal-campus');
  const conteudo = document.getElementById('modal-conteudo');
  
  const todasAsFeatures = ['dashboard', 'horarios', 'notas', 'avaliacoes', 'mapa'];
  const featuresAtuais = campus.features || [];

  conteudo.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      
      <!-- Nome e ID -->
      <div>
        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text);">
          Nome do Campus
        </label>
        <input type="text" id="modal-nome" value="${campus.nome}" placeholder="Nome" style="
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg);
          color: var(--text);
          font-size: 14px;
        " />
      </div>

      <div>
        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text);">
          ID do Campus
        </label>
        <input type="text" value="${campus.id}" disabled style="
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg);
          color: var(--text2);
          font-size: 14px;
        " />
      </div>

      <!-- Status -->
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--card); border-radius: 8px;">
        <input type="checkbox" id="modal-ativo" ${campus.ativo ? 'checked' : ''} style="cursor: pointer; width: 20px; height: 20px;" />
        <label for="modal-ativo" style="cursor: pointer; flex: 1; margin: 0;">
          <strong>Campus ativo</strong>
          <div style="font-size: 12px; color: var(--text2); margin-top: 4px;">
            Quando desativado, usuários não podem acessar o app
          </div>
        </label>
      </div>

      <!-- Features -->
      <div>
        <label style="display: block; margin-bottom: 12px; font-weight: 600; color: var(--text);">
          ⚙️ Recursos (Features)
        </label>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${todasAsFeatures.map(feature => `
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: var(--card); border-radius: 8px;">
              <input type="checkbox" 
                     id="feature-${feature}" 
                     ${featuresAtuais.includes(feature) ? 'checked' : ''} 
                     style="cursor: pointer; width: 18px; height: 18px;" />
              <label for="feature-${feature}" style="cursor: pointer; flex: 1; margin: 0; text-transform: capitalize;">
                <strong>${feature}</strong>
              </label>
            </div>
          `).join('')}
        </div>
        <p style="font-size: 12px; color: var(--text2); margin-top: 12px;">
          <strong>Nota:</strong> Você pode bloquear features individuais mesmo mantendo o campus ativo.
        </p>
      </div>

      <!-- Botões -->
      <div style="display: flex; gap: 12px; margin-top: 20px;">
        <button onclick="fecharModalCampus()" style="
          flex: 1;
          padding: 12px;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        " onmouseover="this.style.background='var(--card)'" onmouseout="this.style.background='transparent'">
          Cancelar
        </button>
        <button onclick="salvarCampusModal('${campus.id}')" style="
          flex: 1;
          padding: 12px;
          background: var(--accent);
          border: none;
          color: #000;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
          💾 Salvar
        </button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

function fecharModalCampus() {
  const modal = document.getElementById('modal-campus');
  modal.style.display = 'none';
}

async function salvarCampusModal(campusId) {
  const nome = document.getElementById('modal-nome').value;
  const ativo = document.getElementById('modal-ativo').checked;
  const features = Array.from(document.querySelectorAll('[id^="feature-"]:checked'))
    .map(el => el.id.replace('feature-', ''));

  // Fechar modal
  fecharModalCampus();

  // Salvar status
  if (window.toggleCampus) {
    await window.toggleCampus(campusId, ativo);
  }

  // Salvar features
  if (window.editarFeaturesDirecto) {
    await window.editarFeaturesDirecto(campusId, features);
  }
}

// Fechar modal ao clicar fora
document.addEventListener('click', (e) => {
  const modal = document.getElementById('modal-campus');
  if (modal && e.target === modal) {
    fecharModalCampus();
  }
});
