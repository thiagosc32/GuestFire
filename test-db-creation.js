const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

console.log('🔄 Iniciando teste de criação do banco...');

// Cria o diretório database se não existir
const dbDir = path.join(__dirname, 'database');
console.log('📁 Diretório do banco:', dbDir);

if (!fs.existsSync(dbDir)) {
    console.log('📁 Criando diretório database...');
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('✅ Diretório criado!');
} else {
    console.log('📁 Diretório já existe.');
}

const dbPath = path.join(dbDir, 'users.db');
console.log('🗄️ Caminho do banco:', dbPath);

// Conecta ao banco de dados
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar com o banco de dados:', err.message);
        return;
    }
    console.log('✅ Conectado ao banco de dados SQLite.');
    
    // Cria a tabela de usuários
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            admin_level INTEGER DEFAULT 0,
            profile_picture TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    db.run(createUsersTable, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela users:', err.message);
        } else {
            console.log('✅ Tabela users criada/verificada.');
            
            // Verifica se já existe um usuário admin
            db.get('SELECT * FROM users WHERE admin_level >= 1', (err, row) => {
                if (err) {
                    console.error('❌ Erro ao verificar usuários admin:', err.message);
                } else if (!row) {
                    console.log('👤 Criando usuário administrador...');
                    
                    // Cria usuário admin
                    const adminPassword = 'admin123';
                    const saltRounds = 10;
                    
                    bcrypt.hash(adminPassword, saltRounds, (err, hash) => {
                        if (err) {
                            console.error('❌ Erro ao gerar hash da senha:', err.message);
                            return;
                        }
                        
                        db.run(
                            'INSERT INTO users (full_name, email, password_hash, admin_level) VALUES (?, ?, ?, ?)',
                            ['Administrador', 'admin@guestfire.com', hash, 1],
                            function(err) {
                                if (err) {
                                    console.error('❌ Erro ao inserir usuário admin:', err.message);
                                } else {
                                    console.log('✅ Usuário administrador criado!');
                                    console.log('📧 Email: admin@guestfire.com');
                                    console.log('🔑 Senha: admin123');
                                }
                                
                                db.close((err) => {
                                    if (err) {
                                        console.error('❌ Erro ao fechar banco:', err.message);
                                    } else {
                                        console.log('✅ Banco de dados fechado.');
                                    }
                                });
                            }
                        );
                    });
                } else {
                    console.log('👤 Usuário administrador já existe.');
                    db.close();
                }
            });
        }
    });
});