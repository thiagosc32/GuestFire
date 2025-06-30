const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Função para inicializar o banco de dados
async function initializeDatabase() {
    return new Promise((resolve, reject) => {
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
                reject(err);
                return;
            }
            console.log('✅ Conectado ao banco de dados SQLite.');
            
            // Continue com a inicialização...
            initializeTables(db, resolve, reject);
        });
    });
}

function initializeTables(db, resolve, reject) {

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
                reject(err);
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

        // Cria a tabela de sessões
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

        // Cria a tabela de logs de login
        const createLoginLogsTable = `
            CREATE TABLE IF NOT EXISTS login_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                email TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                success BOOLEAN NOT NULL,
                error_message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
            )
        `;

        // Cria a tabela de verificações de email
        const createEmailVerificationsTable = `
            CREATE TABLE IF NOT EXISTS email_verifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                used BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;

        // Cria a tabela de redefinições de senha
        const createPasswordResetsTable = `
            CREATE TABLE IF NOT EXISTS password_resets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                used BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;

        // Cria a tabela de pedidos de oração
        const createPrayerRequestsTable = `
            CREATE TABLE IF NOT EXISTS prayer_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                is_anonymous BOOLEAN DEFAULT 0,
                is_urgent BOOLEAN DEFAULT 0,
                status TEXT DEFAULT 'active',
                prayer_count INTEGER DEFAULT 0,
                show_prayer_content BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;

        // Cria a tabela de posts do feed
        const createFeedPostsTable = `
            CREATE TABLE IF NOT EXISTS feed_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                image_url TEXT,
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES feed_posts (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;

        // Cria a tabela de testemunhos
        const createTestimoniesTable = `
            CREATE TABLE IF NOT EXISTS testimonies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                is_anonymous BOOLEAN DEFAULT 0,
                is_approved BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;

        // Executa as queries de criação das tabelas
        db.serialize(() => {
            db.run(createUsersTable, (err) => {
                if (err) {
                    console.error('❌ Erro ao criar tabela users:', err.message);
                    reject(err);
                    return;
                }
                console.log('✅ Tabela users criada/verificada.');
            });

            db.run(createSessionsTable, (err) => {
                if (err) {
                    console.error('❌ Erro ao criar tabela sessions:', err.message);
                } else {
                    console.log('✅ Tabela sessions criada/verificada.');
                }
            });

            db.run(createLoginLogsTable, (err) => {
                if (err) {
                    console.error('❌ Erro ao criar tabela login_logs:', err.message);
                } else {
                    console.log('✅ Tabela login_logs criada/verificada.');
                }
            });

            db.run(createEmailVerificationsTable, (err) => {
                if (err) {
                    console.error('❌ Erro ao criar tabela email_verifications:', err.message);
                } else {
                    console.log('✅ Tabela email_verifications criada/verificada.');
                }
            });

            db.run(createPasswordResetsTable, (err) => {
                if (err) {
                    console.error('❌ Erro ao criar tabela password_resets:', err.message);
                } else {
                    console.log('✅ Tabela password_resets criada/verificada.');
                }
            });

            db.run(createPrayerRequestsTable, (err) => {
                if (err) {
                    console.error('❌ Erro ao criar tabela prayer_requests:', err.message);
                } else {
                    console.log('✅ Tabela prayer_requests criada/verificada.');
                }
            });

            db.run(createFeedPostsTable, (err) => {
                if (err) {
                    console.error('❌ Erro ao criar tabela feed_posts:', err.message);
                } else {
                    console.log('✅ Tabela feed_posts criada/verificada.');
                }
            });

            db.run(createPostLikesTable, (err) => {
                if (err) {
                    console.error('❌ Erro ao criar tabela post_likes:', err.message);
                } else {
                    console.log('✅ Tabela post_likes criada/verificada.');
                }
            });

            db.run(createPostCommentsTable, (err) => {
                if (err) {
                    console.error('❌ Erro ao criar tabela post_comments:', err.message);
                } else {
                    console.log('✅ Tabela post_comments criada/verificada.');
                }
            });

            db.run(createTestimoniesTable, (err) => {
                if (err) {
                    console.error('❌ Erro ao criar tabela testimonies:', err.message);
                } else {
                    console.log('✅ Tabela testimonies criada/verificada.');
                }
            });

            // Verifica se já existe um usuário administrador
            db.get('SELECT COUNT(*) as count FROM users WHERE admin_level >= 2', (err, row) => {
                if (err) {
                    console.error('❌ Erro ao verificar usuários admin:', err.message);
                    reject(err);
                    return;
                }

                if (row.count === 0) {
                    // Cria usuário administrador padrão
                    const adminEmail = 'thiagosc31@hotmail.com';
                    const adminPassword = 'Janeiro312002';
                    const adminName = 'Administrador';

                    bcrypt.hash(adminPassword, 10, (err, hash) => {
                        if (err) {
                            console.error('❌ Erro ao gerar hash da senha:', err.message);
                            reject(err);
                            return;
                        }

                        const insertAdmin = `
                            INSERT INTO users (full_name, email, password_hash, admin_level, is_active)
                            VALUES (?, ?, ?, 3, 1)
                        `;

                        db.run(insertAdmin, [adminName, adminEmail, hash], function(err) {
                            if (err) {
                                console.error('❌ Erro ao inserir usuário admin:', err.message);
                                reject(err);
                            } else {
                                console.log('✅ Usuário administrador criado com sucesso.');
                                console.log('\n📋 Credenciais padrão:');
                                console.log('   Email: thiagosc31@hotmail.com');
                                console.log('   Senha: Janeiro312002');
                                
                                // Fecha a conexão
                                db.close((err) => {
                                    if (err) {
                                        console.error('❌ Erro ao fechar o banco de dados:', err.message);
                                        reject(err);
                                    } else {
                                        console.log('✅ Conexão com o banco de dados fechada.');
                                        resolve();
                                    }
                                });
                            }
                        });
                    });
                } else {
                    console.log('ℹ️  Usuário administrador já existe.');
                    // Fecha a conexão
                    db.close((err) => {
                        if (err) {
                            console.error('❌ Erro ao fechar o banco de dados:', err.message);
                            reject(err);
                        } else {
                            console.log('✅ Conexão com o banco de dados fechada.');
                            resolve();
                        }
                    });
                }
            });
        });
    });
}

// Exporta a função
module.exports = initializeDatabase;

// Se o script for executado diretamente
if (require.main === module) {
    initializeDatabase()
        .then(() => {
            console.log('🎉 Banco de dados inicializado com sucesso!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Erro ao inicializar banco de dados:', error);
            process.exit(1);
        });
}