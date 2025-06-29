@echo off
echo ========================================
echo    INICIANDO SISTEMA DE LOGIN
echo ========================================
echo.

echo [1/3] Verificando dependencias...
if not exist node_modules (
    echo Instalando dependencias do npm...
    npm install
    if errorlevel 1 (
        echo ERRO: Falha ao instalar dependencias!
        pause
        exit /b 1
    )
) else (
    echo Dependencias ja instaladas.
)

echo.
echo [2/3] Inicializando banco de dados...
npm run init-db
if errorlevel 1 (
    echo AVISO: Erro na inicializacao do banco (pode ser normal se ja existir)
)

echo.
echo [3/3] Iniciando servidor...
echo.
echo ========================================
echo  SERVIDOR RODANDO EM: http://localhost:3000
echo ========================================
echo  Paginas disponiveis:
echo  - Login: http://localhost:3000/
echo  - Registro: http://localhost:3000/register.html
echo  - Dashboard: http://localhost:3000/dashboard.html
echo  - Admin: http://localhost:3000/admin.html
echo ========================================
echo.
echo Pressione Ctrl+C para parar o servidor
echo.

npm start

echo.
echo Servidor finalizado.
pause