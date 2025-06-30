# Script PowerShell para inicializar o sistema de login
# Execução: ./start.ps1 ou PowerShell -ExecutionPolicy Bypass -File start.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    INICIANDO SISTEMA DE LOGIN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Função para verificar se um comando existe
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Verificar se Node.js está instalado
if (-not (Test-Command "node")) {
    Write-Host "ERRO: Node.js não encontrado!" -ForegroundColor Red
    Write-Host "Por favor, instale o Node.js em: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Pressione Enter para sair"
    exit 1
}

# Verificar se npm está instalado
if (-not (Test-Command "npm")) {
    Write-Host "ERRO: npm não encontrado!" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host "[1/3] Verificando dependências..." -ForegroundColor Green

# Verificar e instalar dependências
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependências do npm..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: Falha ao instalar dependências!" -ForegroundColor Red
        Read-Host "Pressione Enter para sair"
        exit 1
    }
    Write-Host "Dependências instaladas com sucesso!" -ForegroundColor Green
} else {
    Write-Host "Dependências já instaladas." -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/3] Inicializando banco de dados..." -ForegroundColor Green

# Inicializar banco de dados
npm run init-db
if ($LASTEXITCODE -ne 0) {
    Write-Host "AVISO: Erro na inicialização do banco (pode ser normal se já existir)" -ForegroundColor Yellow
} else {
    Write-Host "Banco de dados inicializado com sucesso!" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/3] Iniciando servidor..." -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SERVIDOR RODANDO EM: http://localhost:3000" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Páginas disponíveis:" -ForegroundColor White
Write-Host "  - Login: http://localhost:3000/" -ForegroundColor Gray
Write-Host "  - Registro: http://localhost:3000/register.html" -ForegroundColor Gray
Write-Host "  - Dashboard: http://localhost:3000/dashboard.html" -ForegroundColor Gray
Write-Host "  - Admin: http://localhost:3000/admin.html" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione Ctrl+C para parar o servidor" -ForegroundColor Yellow
Write-Host ""

# Iniciar servidor
try {
    npm start
} catch {
    Write-Host "Erro ao iniciar servidor: $_" -ForegroundColor Red
} finally {
    Write-Host ""
    Write-Host "Servidor finalizado." -ForegroundColor Yellow
    Read-Host "Pressione Enter para sair"
}