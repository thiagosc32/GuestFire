const fetch = require('node-fetch');

// Teste de login direto via API
async function testLogin() {
    const API_BASE_URL = 'http://localhost:3000/api';
    
    console.log('🔍 Testando login via API...');
    console.log('URL:', `${API_BASE_URL}/auth/login`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'thiagosc31@hotmail.com',
                password: 'Janeiro312002'
            })
        });
        
        console.log('📊 Status da resposta:', response.status);
        console.log('📋 Headers da resposta:', Object.fromEntries(response.headers));
        
        const data = await response.text();
        console.log('📄 Corpo da resposta:', data);
        
        if (response.status === 401) {
            console.log('❌ Erro 401 - Verificando possíveis causas:');
            console.log('1. Usuário não existe no banco');
            console.log('2. Senha incorreta');
            console.log('3. Conta desativada');
            console.log('4. Problema na validação dos dados');
        }
        
    } catch (error) {
        console.error('❌ Erro na requisição:', error.message);
    }
}

// Teste de verificação do banco de dados
async function testDatabase() {
    console.log('\n🗄️ Verificando banco de dados...');
    
    try {
        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        const dbPath = path.join(__dirname, 'database', 'users.db');
        
        console.log('📍 Caminho do banco:', dbPath);
        
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Erro ao conectar:', err.message);
                return;
            }
            console.log('✅ Conectado ao banco de dados');
            
            // Verifica se a tabela users existe
            db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
                if (err) {
                    console.error('❌ Erro ao verificar tabela:', err.message);
                    return;
                }
                
                if (row) {
                    console.log('✅ Tabela users encontrada');
                    
                    // Verifica se existe o usuário
                    db.get('SELECT id, email, is_active FROM users WHERE email = ?', ['thiagosc31@hotmail.com'], (err, user) => {
                        if (err) {
                            console.error('❌ Erro ao buscar usuário:', err.message);
                            return;
                        }
                        
                        if (user) {
                            console.log('✅ Usuário encontrado:', user);
                        } else {
                            console.log('❌ Usuário não encontrado no banco');
                            
                            // Lista todos os usuários
                            db.all('SELECT id, email, full_name, is_active FROM users LIMIT 5', (err, users) => {
                                if (err) {
                                    console.error('❌ Erro ao listar usuários:', err.message);
                                    return;
                                }
                                console.log('👥 Usuários no banco:', users);
                                db.close();
                            });
                        }
                    });
                } else {
                    console.log('❌ Tabela users não encontrada');
                    db.close();
                }
            });
        });
        
    } catch (error) {
        console.error('❌ Erro ao verificar banco:', error.message);
    }
}

// Executa os testes
async function runTests() {
    await testDatabase();
    setTimeout(async () => {
        await testLogin();
    }, 2000);
}

runTests();