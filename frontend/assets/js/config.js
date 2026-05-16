/**
 * CONFIGURAÇÃO DINÂMICA DO AMBIENTE
 * Detecta automaticamente se está em DEV (localhost) ou PROD (web)
 */

const isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';

const config = {
  // URLs do Backend
  backendBaseURL: isDevelopment 
    ? 'http://localhost:3000'
    : 'https://if-hub-backend.onrender.com',
  
  // URLs do Frontend (para redirects)
  frontendBaseURL: isDevelopment
    ? 'http://localhost:5500'
    : 'https://simplifrn.vercel.app',
  
  // API Endpoints
  api: {
    login: () => `${config.backendBaseURL}/auth/login`,
    callback: () => `${config.backendBaseURL}/auth/callback`,
    logout: () => `${config.backendBaseURL}/auth/logout`,
    me: () => `${config.backendBaseURL}/api/me`,
    aluno: () => `${config.backendBaseURL}/api/aluno`,
  },
  
  // Debug
  isDevelopment,
  environment: isDevelopment ? 'development' : 'production',
};

// Log para debug
console.log(`🌍 Ambiente: ${config.environment}`);
console.log(`🔗 Backend: ${config.backendBaseURL}`);
console.log(`🔗 Frontend: ${config.frontendBaseURL}`);

// Exportar para usar em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = config;
}
