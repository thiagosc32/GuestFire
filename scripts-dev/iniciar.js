#!/usr/bin/env node

/**
 * Script Universal de Inicialização do Sistema de Login
 * Detecta automaticamente o sistema operacional e executa o método apropriado
 * 
 * Uso: node iniciar.js [opções]
 * Opções:
 *   --dev, -d     Modo desenvolvimento (com nodemon)
 *   --docker      Usar Docker
 *   --help, -h    Mostrar ajuda
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Cores para console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function colorLog(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function showBanner() {
    colorLog('========================================', 'cyan');
    colorLog('    SISTEMA DE LOGIN - INICIALIZADOR', 'cyan');
    colorLog('========================================', 'cyan');
    console.log('');
}

function showHelp() {
    showBanner();
    colorLog('Uso: node iniciar.js [opções]', 'bright');
    console.log('');
    colorLog('Opções:', 'bright');
    console.log('  --dev, -d     Modo desenvolvimento (com nodemon)');
    console.log('  --docker      Usar Docker');
    console.log('  --help, -h    Mostrar esta ajuda');
    console.log('');
    colorLog('Exemplos:', 'bright');
    console.log('  node iniciar.js           # Inicialização normal');
    console.log('  node iniciar.js --dev     # Modo desenvolvimento');
    console.log('  node iniciar.js --docker  # Usar Docker');
    console.log('');
}

function checkCommand(command) {
    return new Promise((resolve) => {
        exec(`${command} --version`, (error) => {
            resolve(!error);
        });
    });
}

async function checkPrerequisites() {
    colorLog('[1/4] Verificando pré-requisitos...', 'green');
    
    const nodeExists = await checkCommand('node');
    if (!nodeExists) {
        colorLog('ERRO: Node.js não encontrado!', 'red');
        colorLog('Instale em: https://nodejs.org/', 'yellow');
        process.exit(1);
    }
    
    const npmExists = await checkCommand('npm');
    if (!npmExists) {
        colorLog('ERRO: npm não encontrado!', 'red');
        process.exit(1);
    }
    
    colorLog('✓ Node.js e npm encontrados', 'green');
}

function installDependencies() {
    return new Promise((resolve, reject) => {
        colorLog('[2/4] Verificando dependências...', 'green');
        
        if (!fs.existsSync('node_modules')) {
            colorLog('Instalando dependências...', 'yellow');
            const npmInstall = spawn('npm', ['install'], { stdio: 'inherit' });
            
            npmInstall.on('close', (code) => {
                if (code === 0) {
                    colorLog('✓ Dependências instaladas', 'green');
                    resolve();
                } else {
                    colorLog('ERRO: Falha ao instalar dependências', 'red');
                    reject(new Error('npm install failed'));
                }
            });
        } else {
            colorLog('✓ Dependências já instaladas', 'green');
            resolve();
        }
    });
}

function initDatabase() {
    return new Promise((resolve) => {
        colorLog('[3/4] Inicializando banco de dados...', 'green');
        
        const initDb = spawn('npm', ['run', 'init-db'], { stdio: 'inherit' });
        
        initDb.on('close', (code) => {
            if (code === 0) {
                colorLog('✓ Banco de dados inicializado', 'green');
            } else {
                colorLog('⚠ Aviso: Erro na inicialização do banco (pode ser normal)', 'yellow');
            }
            resolve();
        });
    });
}

function startServer(devMode = false) {
    colorLog('[4/4] Iniciando servidor...', 'green');
    console.log('');
    
    colorLog('========================================', 'cyan');
    colorLog('  SERVIDOR RODANDO EM: http://localhost:3000', 'bright');
    colorLog('========================================', 'cyan');
    colorLog('  Páginas disponíveis:', 'bright');
    console.log('  - Login: http://localhost:3000/');
    console.log('  - Registro: http://localhost:3000/register.html');
    console.log('  - Dashboard: http://localhost:3000/dashboard.html');
    console.log('  - Admin: http://localhost:3000/admin.html');
    colorLog('========================================', 'cyan');
    console.log('');
    colorLog('Pressione Ctrl+C para parar o servidor', 'yellow');
    console.log('');
    
    const command = devMode ? 'dev' : 'start';
    const server = spawn('npm', ['run', command], { stdio: 'inherit' });
    
    // Capturar sinais de interrupção
    process.on('SIGINT', () => {
        console.log('');
        colorLog('Parando servidor...', 'yellow');
        server.kill('SIGINT');
        process.exit(0);
    });
    
    server.on('close', (code) => {
        console.log('');
        colorLog('Servidor finalizado.', 'yellow');
        process.exit(code);
    });
}

function startWithDocker() {
    colorLog('Iniciando com Docker...', 'green');
    
    const dockerCompose = spawn('docker-compose', ['up', '--build'], { stdio: 'inherit' });
    
    process.on('SIGINT', () => {
        console.log('');
        colorLog('Parando containers...', 'yellow');
        exec('docker-compose down', () => {
            process.exit(0);
        });
    });
    
    dockerCompose.on('close', (code) => {
        console.log('');
        colorLog('Containers finalizados.', 'yellow');
        process.exit(code);
    });
}

async function main() {
    const args = process.argv.slice(2);
    
    // Verificar argumentos
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }
    
    const devMode = args.includes('--dev') || args.includes('-d');
    const useDocker = args.includes('--docker');
    
    showBanner();
    
    if (useDocker) {
        const dockerExists = await checkCommand('docker-compose');
        if (!dockerExists) {
            colorLog('ERRO: Docker Compose não encontrado!', 'red');
            colorLog('Instale Docker Desktop em: https://www.docker.com/products/docker-desktop', 'yellow');
            process.exit(1);
        }
        startWithDocker();
        return;
    }
    
    try {
        await checkPrerequisites();
        await installDependencies();
        await initDatabase();
        startServer(devMode);
    } catch (error) {
        colorLog(`ERRO: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Executar apenas se for chamado diretamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main, checkCommand, colorLog };