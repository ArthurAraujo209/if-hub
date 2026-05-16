# 📚 Documentação Técnica - Detecção Automática de Ambiente

## 🎯 Objetivo

Permitir que o mesmo código funcione em:
- ✅ **Desenvolvimento Local** (localhost)
- ✅ **Produção** (Vercel + Onrender)

Sem alterar código entre os ambientes.

---

## 🔍 Como Detecta o Ambiente?

### Frontend (`config.js`)

```javascript
const isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';

// Se localhost → usa URLs locais
// Senão → usa URLs de produção
```

**Detecção baseada em:** `window.location.hostname`

| Situação | Hostname | Resultado |
|----------|----------|-----------|
| Rodando em Live Server | `localhost` | Usa `http://localhost:3000` |
| Rodando em VS Code | `127.0.0.1` | Usa `http://localhost:3000` |
| Deploy em Vercel | `simplifrn.vercel.app` | Usa `https://if-hub-backend.onrender.com` |

---

### Backend (`server.js`)

```javascript
// Middleware que detecta a ORIGEM da requisição
app.use((req, res, next) => {
  const origin = req.get('origin') || req.get('referer') || '';
  
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    req.frontendURL = 'http://localhost:5500';
    req.environment = 'development';
  } else {
    req.frontendURL = process.env.FRONTEND_URL || 'https://simplifrn.vercel.app';
    req.environment = 'production';
  }
  
  next();
});
```

**Detecção baseada em:** Header `Origin` da requisição HTTP

| Situação | Origin | Resultado |
|----------|--------|-----------|
| Requisição de localhost | `http://localhost:5500` | Redireciona para `http://localhost:5500` |
| Requisição de Vercel | `https://simplifrn.vercel.app` | Redireciona para `https://simplifrn.vercel.app` |

---

## 🔄 Fluxo de Login Completo

### LOCAL

```
1. Usuário em http://localhost:5500 clica "Entrar"
   ↓
2. Frontend detecta: hostname = localhost
   ↓
3. Redireciona para: http://localhost:3000/auth/login
   ↓
4. Backend recebe requisição
   ↓
5. Backend detecta: origin = localhost
   ↓
6. Redireciona para SUAP com callback: http://localhost:3000/auth/callback
   ↓
7. Após SUAP: Backend redireciona para: http://localhost:5500/callback.html?token=...
   ↓
8. Frontend faz login com o token
```

### PRODUÇÃO

```
1. Usuário em https://simplifrn.vercel.app clica "Entrar"
   ↓
2. Frontend detecta: hostname = simplifrn.vercel.app
   ↓
3. Redireciona para: https://if-hub-backend.onrender.com/auth/login
   ↓
4. Backend recebe requisição
   ↓
5. Backend detecta: origin = simplifrn.vercel.app
   ↓
6. Redireciona para SUAP com callback: https://if-hub-backend.onrender.com/auth/callback
   ↓
7. Após SUAP: Backend redireciona para: https://simplifrn.vercel.app/callback.html?token=...
   ↓
8. Frontend faz login com o token
```

---

## 📁 Arquivos Envolvidos

### Frontend

| Arquivo | Função |
|---------|--------|
| `config.js` | 🆕 Centraliza config e detecta ambiente |
| `index.html` | Usa `config.api.login()` |
| `callback.html` | Importa `config.js` |
| `auth.js` | Detecta backend dinamicamente |
| `dashboard.js` | Detecta backend dinamicamente |

### Backend

| Arquivo | Função |
|---------|--------|
| `server.js` | Middleware de detecção de ambiente |
| `src/routes/auth.js` | Usa `req.frontendURL` |
| `.env` | Configuração de produção |
| `.env.local` | Configuração de desenvolvimento |

---

## 🚀 Deployment

### Vercel (Frontend)

```bash
# Variáveis de ambiente (não precisa mudar nada)
# O código detecta automaticamente
```

### Onrender (Backend)

```bash
# Variáveis de ambiente
NODE_ENV=production
REDIRECT_URI=https://if-hub-backend.onrender.com/auth/callback
FRONTEND_URL=https://simplifrn.vercel.app
# ... outras configs
```

---

## ⚠️ Pontos Importantes

1. **Não alterar URLs hardcoded** - sempre usar detecção
2. **CORS precisa de ambas as origins** - já configurado em `server.js`
3. **Em produção**, as variáveis de ambiente do Onrender são usadas
4. **Em desenvolvimento**, a detecção de `localhost` é usada

---

## 🔧 Adicionar Novo Endpoint?

Sempre use `config.js` no frontend:

```javascript
// ❌ ERRADO (hardcoded)
fetch('https://if-hub-backend.onrender.com/api/dados')

// ✅ CERTO (dinâmico)
fetch(`${config.backendBaseURL}/api/dados`)

// ✅ OU usar a função helper
fetch(config.api.me())
```

---

## 🐛 Debug

### Frontend Console
```javascript
console.log(config.isDevelopment) // true/false
console.log(config.backendBaseURL) // URL sendo usada
console.log(config.environment) // 'development' ou 'production'
```

### Backend Console
```bash
# Ao iniciar, verá:
🌍 NODE_ENV: development
🌍 REDIRECT_URI: http://localhost:3000/auth/callback
🌍 Environment: DEVELOPMENT
```

---

## 📊 Resumo

| Aspecto | Local | Produção |
|--------|-------|----------|
| **Frontend** | Detecta `localhost` | Detecta domínio |
| **Backend** | Detecta origin `localhost` | Detecta origin Vercel |
| **URLs** | `http://localhost:*` | `https://domínios.com` |
| **Mudanças necessárias** | ❌ Nenhuma | ❌ Nenhuma |

**Resultado:** Um único código funciona em ambos os ambientes! 🎉
