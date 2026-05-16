# 🚀 Configuração de Ambiente - Desenvolvimento Local + Produção

## ⚙️ Como Funciona Agora?

✅ **Backend** detecta automaticamente se está rodando localmente ou em produção
✅ **Frontend** detecta automaticamente o ambiente e usa URLs corretas
✅ **Um único código** funciona em ambos os ambientes

---

## 🏠 Para Rodar LOCALMENTE

### 1️⃣ Backend (Node.js)

```bash
cd backend

# Instalar dependências (se não feito ainda)
npm install

# Rodar servidor local
npm start
# ou
node server.js
```

O backend rodará em `http://localhost:3000`

### 2️⃣ Frontend (HTML/JS)

Abra em um **Live Server** na porta **5500**:

**Opção 1: VS Code + Live Server Extension**
- Clique direito em `index.html`
- Selecione "Open with Live Server"
- Abrirá em `http://localhost:5500`

**Opção 2: Terminal**
```bash
# Instalar live-server (se não tiver)
npm install -g live-server

# Rodar frontend
cd frontend
live-server --port=5500
```

---

## ✅ Verificar Se Está Funcionando

### Backend
```bash
curl http://localhost:3000/ping
# Resposta: "pong"
```

### Frontend
1. Abra `http://localhost:5500` no navegador
2. Clique em "Entrar com SUAP"
3. Se o login começar, significa que está funcionando! ✅

---

## 🌐 Configuração Automática

### 📝 Como Funciona?

**No Frontend:**
- O arquivo `/frontend/assets/js/config.js` detecta:
  - Se `window.location.hostname` é `localhost` → usa `http://localhost:3000`
  - Senão → usa `https://if-hub-backend.onrender.com`

**No Backend:**
- O arquivo `server.js` detecta:
  - Se a origem da requisição é `localhost` → redireciona para `http://localhost:5500`
  - Senão → redireciona para `https://simplifrn.vercel.app` (ou sua URL de prod)

### 🔧 Arquivos Modificados

```
backend/
├── server.js                    # Adicionado middleware de detecção
├── src/routes/auth.js           # Usa req.frontendURL dinâmico
├── .env                         # Produção
└── .env.local                   # Desenvolvimento local (referência)

frontend/
├── index.html                   # Script para login dinâmico
├── callback.html                # Importa config.js
├── auth.js                      # Detecta backend dinamicamente
└── assets/js/
    ├── config.js                # 🆕 Arquivo de configuração centralizada
    └── dashboard.js             # Detecta backend dinamicamente
```

---

## 🚢 Para PUBLICAR (Produção)

Quando fizer commit no GitHub:

1. **Vercel (Frontend)** receberá o código
2. **Onrender (Backend)** receberá o código
3. **Automaticamente usarão as URLs de produção**

**Nenhuma mudança necessária no código!** ✅

---

## 🐛 Troubleshooting

### "Nenhum dado de autenticação recebido"
- Certifique-se que tanto backend quanto frontend estão rodando
- Verifique se estão nas portas corretas (3000 e 5500)
- Limpe cache do navegador (Ctrl+Shift+Delete)

### Backend retorna erro de CORS
- Verifique se a origin está na lista de CORS em `server.js`
- Adicione se necessário: `'http://localhost:5500'`

### Firebase login falha
- Verifique se `.env` tem as credenciais corretas
- Firebase precisa de variáveis de ambiente válidas

---

## 📋 Resumo das URLs

| Ambiente | Frontend | Backend |
|----------|----------|---------|
| **Dev Local** | http://localhost:5500 | http://localhost:3000 |
| **Produção** | https://simplifrn.vercel.app | https://if-hub-backend.onrender.com |

---

## 💡 Dicas

- **Não altere URLs hardcoded** - tudo é dinâmico agora
- **Use o config.js** para adicionar novos endpoints
- **Em produção**, as variáveis de ambiente no Vercel/Onrender são usadas automaticamente

---

## ❓ Perguntas?

Verifique os logs do console (F12) para debug automático do ambiente detectado! 🔍
