#!/bin/bash

# Script para inicializar o sistema de login
# Execução: ./start.sh ou bash start.sh

echo "========================================"
echo "    INICIANDO SISTEMA DE LOGIN"
echo "========================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Função para verificar se um comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar se Node.js está instalado
if ! command_exists node; then
    echo -e "${RED}ERRO: Node.js não encontrado!${NC}"
    echo -e "${YELLOW}Por favor, instale o Node.js em: https://nodejs.org/${NC}"
    read -p "Pressione Enter para sair"
    exit 1
fi

# Verificar se npm está instalado
if ! command_exists npm; then
    echo -e "${RED}ERRO: npm não encontrado!${NC}"
    read -p "Pressione Enter para sair"
    exit 1
fi

echo -e "${GREEN}[1/3] Verificando dependências...${NC}"

# Verificar e instalar dependências
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Instalando dependências do npm...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERRO: Falha ao instalar dependências!${NC}"
        read -p "Pressione Enter para sair"
        exit 1
    fi
    echo -e "${GREEN}Dependências instaladas com sucesso!${NC}"
else
    echo -e "${GREEN}Dependências já instaladas.${NC}"
fi

echo ""
echo -e "${GREEN}[2/3] Inicializando banco de dados...${NC}"

# Inicializar banco de dados
npm run init-db
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}AVISO: Erro na inicialização do banco (pode ser normal se já existir)${NC}"
else
    echo -e "${GREEN}Banco de dados inicializado com sucesso!${NC}"
fi

echo ""
echo -e "${GREEN}[3/3] Iniciando servidor...${NC}"
echo ""

echo -e "${CYAN}========================================${NC}"
echo -e "  SERVIDOR RODANDO EM: http://localhost:3000"
echo -e "${CYAN}========================================${NC}"
echo "  Páginas disponíveis:"
echo "  - Login: http://localhost:3000/"
echo "  - Registro: http://localhost:3000/register.html"
echo "  - Dashboard: http://localhost:3000/dashboard.html"
echo "  - Admin: http://localhost:3000/admin.html"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${YELLOW}Pressione Ctrl+C para parar o servidor${NC}"
echo ""

# Função para cleanup ao sair
cleanup() {
    echo ""
    echo -e "${YELLOW}Servidor finalizado.${NC}"
    exit 0
}

# Capturar sinais de interrupção
trap cleanup SIGINT SIGTERM

# Iniciar servidor
npm start

# Se chegou aqui, o servidor parou
echo ""
echo -e "${YELLOW}Servidor finalizado.${NC}"