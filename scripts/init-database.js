const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Cria o diretório database se não existir
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'users.db');

// Conecta ao banco de dados
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar com o banco de dados:', err.message);
        return;
    }
    console.log('✅ Conectado ao banco de dados SQLite.');
});

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

// Cria a tabela de sessões (opcional, para controle de sessões)
const createSessionsTable = `
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
`;

// Cria a tabela de logs de login (para auditoria)
const createLoginLogsTable = `
    CREATE TABLE IF NOT EXISTS login_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        email TEXT NOT NULL,
        success BOOLEAN NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    )
`;

// Cria a tabela de códigos de verificação por email
const createEmailVerificationTable = `
    CREATE TABLE IF NOT EXISTS email_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        verification_code TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        is_used BOOLEAN DEFAULT 0,
        user_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`;

// Cria a tabela de recuperação de senha
const createPasswordResetsTable = `
    CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        reset_code TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`;

// Cria a tabela de pedidos de oração
const createPrayerRequestsTable = `
    CREATE TABLE IF NOT EXISTS prayer_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'ativo',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
`;

// Cria a tabela de posts do feed espiritual
const createFeedPostsTable = `
    CREATE TABLE IF NOT EXISTS feed_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('oracao', 'testemunho', 'devocional')),
        content TEXT NOT NULL,
        is_anonymous BOOLEAN DEFAULT 0,
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
`;

// Cria a tabela de curtidas dos posts
const createPostLikesTable = `
    CREATE TABLE IF NOT EXISTS post_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES feed_posts (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(post_id, user_id)
    )
`;

// Cria a tabela de comentários dos posts
const createPostCommentsTable = `
    CREATE TABLE IF NOT EXISTS post_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        is_anonymous BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES feed_posts (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
`;

// Cria a tabela de testemunhos vinculados a pedidos
const createTestimoniesTable = `
    CREATE TABLE IF NOT EXISTS testimonies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prayer_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        is_public BOOLEAN DEFAULT 0,
        is_anonymous BOOLEAN DEFAULT 0,
        feed_post_id INTEGER NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (prayer_id) REFERENCES prayer_requests (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (feed_post_id) REFERENCES feed_posts (id) ON DELETE SET NULL
    )
`;

// Executa a criação das tabelas
db.serialize(() => {
    // Cria tabela de usuários
    db.run(createUsersTable, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela users:', err.message);
        } else {
            console.log('✅ Tabela users criada com sucesso.');
        }
    });

    // Cria tabela de sessões
    db.run(createSessionsTable, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela sessions:', err.message);
        } else {
            console.log('✅ Tabela sessions criada com sucesso.');
        }
    });

    // Cria tabela de logs
    db.run(createLoginLogsTable, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela login_logs:', err.message);
        } else {
            console.log('✅ Tabela login_logs criada com sucesso.');
        }
    });

    // Cria tabela de verificação por email
    db.run(createEmailVerificationTable, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela email_verifications:', err.message);
        } else {
            console.log('✅ Tabela email_verifications criada com sucesso.');
        }
    });

    // Cria tabela de recuperação de senha
    db.run(createPasswordResetsTable, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela password_resets:', err.message);
        } else {
            console.log('✅ Tabela password_resets criada com sucesso.');
        }
    });

    // Cria tabela de pedidos de oração
    db.run(createPrayerRequestsTable, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela prayer_requests:', err.message);
        } else {
            console.log('✅ Tabela prayer_requests criada com sucesso.');
        }
    });

    // Cria tabela de posts do feed
    db.run(createFeedPostsTable, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela feed_posts:', err.message);
        } else {
            console.log('✅ Tabela feed_posts criada com sucesso.');
        }
    });

    // Cria tabela de curtidas
    db.run(createPostLikesTable, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela post_likes:', err.message);
        } else {
            console.log('✅ Tabela post_likes criada com sucesso.');
        }
    });

    // Cria tabela de comentários
    db.run(createPostCommentsTable, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela post_comments:', err.message);
        } else {
            console.log('✅ Tabela post_comments criada com sucesso.');
        }
    });

    // Cria tabela de testemunhos
    db.run(createTestimoniesTable, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela testimonies:', err.message);
        } else {
            console.log('✅ Tabela testimonies criada com sucesso.');
        }
    });

    // Adiciona coluna profile_picture se não existir (para bancos existentes)
    db.run(`PRAGMA table_info(users)`, (err, rows) => {
        if (err) {
            console.error('❌ Erro ao verificar estrutura da tabela users:', err.message);
            return;
        }
        
        // Verifica se a coluna profile_picture já existe
        db.all(`PRAGMA table_info(users)`, (err, columns) => {
            if (err) {
                console.error('❌ Erro ao obter informações da tabela:', err.message);
                return;
            }
            
            const hasProfilePicture = columns.some(col => col.name === 'profile_picture');
            
            if (!hasProfilePicture) {
                db.run(`ALTER TABLE users ADD COLUMN profile_picture TEXT`, (err) => {
                    if (err) {
                        console.error('❌ Erro ao adicionar coluna profile_picture:', err.message);
                    } else {
                        console.log('✅ Coluna profile_picture adicionada com sucesso.');
                    }
                    
                    // Insere usuário administrador após adicionar a coluna
                    insertAdminUser();
                });
            } else {
                console.log('✅ Coluna profile_picture já existe.');
                // Insere usuário administrador se a coluna já existe
                insertAdminUser();
            }
        });
    });
    
    // Função para inserir usuário administrador
    function insertAdminUser() {
        const bcrypt = require('bcryptjs');
        const adminPassword = bcrypt.hashSync('Janeiro312002', 12);
        
        const insertAdmin = `
            INSERT OR IGNORE INTO users (full_name, email, password_hash)
            VALUES (?, ?, ?)
        `;
        
        db.run(insertAdmin, ['Administrador', 'thiagosc31@hotmail.com', adminPassword], function(err) {
            if (err) {
                console.error('❌ Erro ao inserir usuário admin:', err.message);
            } else if (this.changes > 0) {
                console.log('✅ Usuário administrador criado com sucesso.');
            } else {
                console.log('ℹ️  Usuário administrador já existe.');
            }
            
            // Fecha a conexão após todas as operações
            db.close((err) => {
                if (err) {
                    console.error('❌ Erro ao fechar o banco de dados:', err.message);
                } else {
                    console.log('✅ Conexão com o banco de dados fechada.');
                    console.log('\n🎉 Banco de dados inicializado com sucesso!');
                    console.log('\n📋 Credenciais padrão:');
                    console.log('   Email: thiagosc31@hotmail.com');
                    console.log('   Senha: Janeiro312002');
                }
            });
        });
    }
});