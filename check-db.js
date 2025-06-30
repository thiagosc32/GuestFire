const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conecta ao banco de dados
const dbPath = path.join(__dirname, 'database', 'users.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando estrutura do banco de dados...');

// Verifica se o banco existe e lista as tabelas
db.serialize(() => {
    // Lista todas as tabelas
    db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, tables) => {
        if (err) {
            console.error('❌ Erro ao listar tabelas:', err.message);
        } else {
            console.log('📋 Tabelas encontradas:', tables);
            
            // Se a tabela users existe, mostra sua estrutura
            const userTable = tables.find(t => t.name === 'users');
            if (userTable) {
                console.log('\n🔍 Estrutura da tabela users:');
                db.all("PRAGMA table_info(users);", (err, columns) => {
                    if (err) {
                        console.error('❌ Erro ao obter estrutura:', err.message);
                    } else {
                        console.table(columns);
                        
                        // Verifica se há usuários
                        db.all("SELECT id, full_name, email, admin_level, is_active FROM users;", (err, users) => {
                            if (err) {
                                console.error('❌ Erro ao buscar usuários:', err.message);
                            } else {
                                console.log('\n👥 Usuários cadastrados:');
                                console.table(users);
                            }
                            db.close();
                        });
                    }
                });
            } else {
                console.log('⚠️ Tabela users não encontrada!');
                db.close();
            }
        }
    });
});