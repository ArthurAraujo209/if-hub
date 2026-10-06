// assets/js/config.js
(() => {
  const isDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);

  const backendURL  = isDev ? 'http://localhost:3000' : 'https://if-hub-backend.onrender.com';
  const frontendURL = isDev ? 'http://localhost:5500' : 'https://simplifrn.vercel.app';

  const config = {
    isDev,
    backendURL,
    frontendURL,
    api: {
      login:          () => `${backendURL}/auth/login`,
      logout:         () => `${backendURL}/auth/logout`,
      refresh:        () => `${backendURL}/auth/refresh`,
      token:          () => `${backendURL}/auth/token`,
      me:             () => `${backendURL}/api/me`,
      dashboard:      (ano) => `${backendURL}/api/dashboard/${ano}`,
      boletimAnual:   (ano) => `${backendURL}/api/boletim-anual/${ano}`,
      campusFeatures: (id)  => `${backendURL}/api/campus/features/${id}`,
      notifications:  (action) => `${backendURL}/api/notifications/${action}`,
    },
  };

  // Compatibilidade: expõe os dois nomes
  window.config = config;          // legado (index.html, callback.html)
  window.IFHubConfig = config;     // novo padrão (módulos ESM)

  console.log(`🌍 [${isDev ? 'DEV' : 'PROD'}] backend=${backendURL}`);
})();