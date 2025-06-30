const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conecta ao banco de dados
const dbPath = path.join(__dirname, 'database', 'users.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Corrigindo estrutura do banco de dados...');

db.serialize(() => {
    // Adiciona a coluna admin_level se ela não existir
    db.run("ALTER TABLE users ADD COLUMN admin_level INTEGER DEFAULT 0;", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ Coluna admin_level já existe!');
            } else {
                console.error('❌ Erro ao adicionar coluna admin_level:', err.message);
            }
        } else {
            console.log('✅ Coluna admin_level adicionada com sucesso!');
        }
        
        // Verifica se existe o usuário administrador
        db.get("SELECT * FROM users WHERE email = 'thiagosc31@hotmail.com';", (err, user) => {
            if (err) {
                console.error('❌ Erro ao verificar usuário admin:', err.message);
            } else if (user) {
                // Atualiza o usuário existente para ser administrador
                db.run("UPDATE users SET admin_level = 1 WHERE email = 'thiagosc31@hotmail.com';", (err) => {
                    if (err) {
                        console.error('❌ Erro ao atualizar admin_level:', err.message);
                    } else {
                        console.log('✅ Usuário administrador atualizado!');
                    }
                    
                    // Mostra a estrutura final
                    showFinalStructure();
                });
            } else {
                console.log('⚠️ Usuário administrador não encontrado. Execute o script de inicialização primeiro.');
                showFinalStructure();
            }
        });
    });
});

function showFinalStructure() {
    console.log('\n🔍 Estrutura final da tabela users:');
    db.all("PRAGMA table_info(users);", (err, columns) => {
        if (err) {
            console.error('❌ Erro ao obter estrutura:', err.message);
        } else {
            console.table(columns);
            
            // Mostra os usuários
            db.all("SELECT id, full_name, email, admin_level, is_active FROM users;", (err, users) => {
                if (err) {
                    console.error('❌ Erro ao buscar usuários:', err.message);
                } else {
                    console.log('\n👥 Usuários cadastrados:');
                    console.table(users);
                }
                db.close();
                console.log('\n✅ Correção concluída! Reinicie o servidor.');
            });
        }
    });
}