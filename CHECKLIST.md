# ✅ Checklist de Configuração

## 🔧 Backend

- [x] `server.js` - Middleware de detecção adicionado
- [x] `src/routes/auth.js` - Usa `req.frontendURL` dinâmico
- [x] `.env` - Configuração de produção
- [x] `.env.local` - Referência para desenvolvimento
- [x] `.env.example` - Documentação de variáveis
- [x] `package.json` - Scripts npm atualizados
- [x] CORS configurado para localhost e produção

## 🎨 Frontend

- [x] `assets/js/config.js` - 🆕 Arquivo de configuração central
- [x] `index.html` - Login usando `config.api.login()`
- [x] `callback.html` - Importa `config.js`
- [x] `auth.js` - Detecção dinâmica de backend
- [x] `assets/js/dashboard.js` - Detecção dinâmica de backend

## 📚 Documentação

- [x] `SETUP_LOCAL.md` - Como rodar localmente
- [x] `AMBIENTE_DETECCAO.md` - Explicação técnica
- [x] `START_LOCAL.sh` - Script para iniciar (opcional)
- [x] `.env.example` - Variáveis de ambiente

---

## 🚀 Próximos Passos

### 1. Teste LOCALMENTE

```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend (Live Server na porta 5500)
cd frontend
npx live-server --port=5500

# Abra http://localhost:5500 no navegador
# Clique em "Entrar com SUAP"
```

Deve redirecionar para SUAP e retornar após login ✅

### 2. Verificar Logs

**Backend:**
```
🌍 NODE_ENV: development
🌍 REDIRECT_URI: http://localhost:3000/auth/callback
🌍 Environment: DEVELOPMENT
```

**Frontend Console (F12):**
```
🌍 Ambiente: development
🔗 Backend: http://localhost:3000
🔗 Frontend: http://localhost:5500
```

### 3. Fazer Commit

```bash
git add .
git commit -m "✨ Feat: Detecção automática de ambiente (dev/prod)"
git push
```

### 4. Verificar em Produção

Acesse: `https://simplifrn.vercel.app`

Frontend console deve mostrar:
```
🌍 Ambiente: production
🔗 Backend: https://if-hub-backend.onrender.com
🔗 Frontend: https://simplifrn.vercel.app
```

---

## 🐛 Possíveis Problemas

### ❌ "Nenhum dado de autenticação recebido"
- Backend retornar erro no callback
- **Solução:** Verificar `.env` local está correto

### ❌ CORS error
- Frontend e Backend em portas diferentes sem CORS
- **Solução:** Já está configurado em `server.js`

### ❌ Firebase login falha
- Credenciais do Firebase incorretas
- **Solução:** Verificar `.env` Firebase

### ❌ "Cannot find module config.js"
- Scripts não carregam antes do módulo
- **Solução:** Usar `<script>` normal antes de módules

---

## 📋 Variáveis de Ambiente Necessárias

### .env (Produção - Onrender)
```
NODE_ENV=production
REDIRECT_URI=https://if-hub-backend.onrender.com/auth/callback
FRONTEND_URL=https://simplifrn.vercel.app
CLIENT_ID=...
CLIENT_SECRET=...
SUAP_BASE_URL=https://suap.ifrn.edu.br
FIREBASE_*=...
```

### .env (Local - Development)
```
NODE_ENV=development
REDIRECT_URI=http://localhost:3000/auth/callback
FRONTEND_URL=http://localhost:5500
# Mesmas credenciais Firebase, SUAP, etc
```

---

## 🎓 Como Adicionar Novos Endpoints?

### Adicionar no Frontend

1. Edite `frontend/assets/js/config.js`:

```javascript
api: {
  login: () => `${config.backendBaseURL}/auth/login`,
  meuNovoEndpoint: () => `${config.backendBaseURL}/api/novo`,
}
```

2. Use em qualquer lugar:

```javascript
fetch(config.api.meuNovoEndpoint())
```

---

## 🚢 Deployment Final

1. **Vercel (Frontend)**
   - Conecte o repositório
   - Nenhuma variável de ambiente necessária
   - Detecta automaticamente

2. **Onrender (Backend)**
   - Crie um novo Web Service
   - Adicione variáveis de produção
   - Deploy automático ao push

3. **GitHub**
   - Faça commit normalmente
   - Ambas as plataformas atualizam automaticamente

---

## ✨ Resultado Final

| Caso | Frontend | Backend | Resultado |
|------|----------|---------|-----------|
| Dev Local | http://localhost:5500 | http://localhost:3000 | ✅ Funciona |
| Prod | https://simplifrn.vercel.app | https://if-hub-backend.onrender.com | ✅ Funciona |
| Misto | Prod | Dev | ❌ Falha (CORS) |

---

## 🎉 Pronto!

Seu projeto agora funciona em qualquer ambiente sem mudanças de código!
