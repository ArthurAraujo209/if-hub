#!/bin/bash

# 🚀 QUICK START - Rodar tudo com um comando

echo "🌍 Iniciando IF-Hub em DESENVOLVIMENTO LOCAL..."
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar se Node está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado. Instale de https://nodejs.org"
    exit 1
fi

echo -e "${BLUE}📦 Instalando dependências do backend...${NC}"
cd backend
npm install

echo -e "${GREEN}✅ Backend instalado${NC}"
echo ""

# Terminal 1: Backend
echo -e "${BLUE}🚀 Iniciando Backend em http://localhost:3000${NC}"
npm start &
BACKEND_PID=$!

# Aguardar backend iniciar
sleep 3

echo ""
echo -e "${BLUE}📝 Frontend precisa de um Live Server${NC}"
echo -e "${BLUE}Opção 1: VS Code${NC}"
echo "  1. Abra a pasta 'frontend' no VS Code"
echo "  2. Clique direito em 'frontend/index.html'"
echo "  3. Selecione 'Open with Live Server'"
echo ""
echo -e "${BLUE}Opção 2: Terminal (instale globalmente primeiro)${NC}"
echo "  npm install -g live-server"
echo "  cd frontend && live-server --port=5500"
echo ""
echo -e "${GREEN}✅ Backend rodando! Abra http://localhost:5500 no navegador${NC}"
echo ""
echo "Pressione Ctrl+C para parar o backend"

wait $BACKEND_PID
