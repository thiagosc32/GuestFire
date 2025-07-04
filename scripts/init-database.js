
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const dbDir = path.join(__dirname, '..', 'database');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        const dbPath = path.join(dbDir, 'users.db');

        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Erro ao conectar com o banco de dados:', err.message);
                reject(err);
                return;
            }
            console.log('✅ Conectado ao banco de dados SQLite.');
            initializeTables(db, resolve, reject);
        });
    });
}

function initializeTables(db, resolve, reject) {
    const createTables = [
        "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, is_active BOOLEAN DEFAULT 1, admin_level INTEGER DEFAULT 0, profile_picture TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
        "CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, token_hash TEXT NOT NULL, expires_at DATETIME NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)",
        "CREATE TABLE IF NOT EXISTS login_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, email TEXT NOT NULL, success BOOLEAN NOT NULL, ip_address TEXT, user_agent TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL)",
        "CREATE TABLE IF NOT EXISTS email_verifications (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, verification_code TEXT NOT NULL, expires_at DATETIME NOT NULL, is_used BOOLEAN DEFAULT 0, user_data TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
        "CREATE TABLE IF NOT EXISTS password_resets (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, reset_code TEXT NOT NULL, expires_at DATETIME NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
        "CREATE TABLE IF NOT EXISTS prayer_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, status TEXT DEFAULT 'ativo', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)",
        "CREATE TABLE IF NOT EXISTS feed_posts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, type TEXT NOT NULL CHECK (type IN ('oracao', 'testemunho', 'devocional')), content TEXT NOT NULL, is_anonymous BOOLEAN DEFAULT 0, likes_count INTEGER DEFAULT 0, comments_count INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)",
        "CREATE TABLE IF NOT EXISTS post_likes (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL, user_id INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (post_id) REFERENCES feed_posts (id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE, UNIQUE(post_id, user_id))",
        "CREATE TABLE IF NOT EXISTS post_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL, user_id INTEGER NOT NULL, content TEXT NOT NULL, is_anonymous BOOLEAN DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (post_id) REFERENCES feed_posts (id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE)",
        "CREATE TABLE IF NOT EXISTS testimonies (id INTEGER PRIMARY KEY AUTOINCREMENT, prayer_id INTEGER NOT NULL, user_id INTEGER NOT NULL, content TEXT NOT NULL, is_public BOOLEAN DEFAULT 0, is_anonymous BOOLEAN DEFAULT 0, feed_post_id INTEGER NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (prayer_id) REFERENCES prayer_requests (id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE, FOREIGN KEY (feed_post_id) REFERENCES feed_posts (id) ON DELETE SET NULL)"
    ];

    db.serialize(() => {
        let completed = 0;
        for (const query of createTables) {
            db.run(query, (err) => {
                if (err) {
                    console.error('Erro ao criar tabela:', err.message);
                    reject(err);
                    return;
                }
                completed++;
                if (completed === createTables.length) {
                    insertAdminUser(db, resolve, reject);
                }
            });
        }
    });
}

function insertAdminUser(db, resolve, reject) {
    db.get("SELECT COUNT(*) as count FROM users WHERE admin_level >= 2", (err, row) => {
        if (err) {
            console.error('Erro ao verificar usuários admin:', err.message);
            reject(err);
            return;
        }

        if (row.count === 0) {
            const adminEmail = 'thiagosc31@hotmail.com';
            const adminPassword = 'Janeiro312002';
            const adminName = 'Administrador';

            bcrypt.hash(adminPassword, 10, (err, hash) => {
                if (err) {
                    console.error('Erro ao gerar hash da senha:', err.message);
                    reject(err);
                    return;
                }

                const insertAdmin = "INSERT INTO users (full_name, email, password_hash, admin_level, is_active) VALUES (?, ?, ?, 3, 1)";

                db.run(insertAdmin, [adminName, adminEmail, hash], function(err) {
                    if (err) {
                        console.error('Erro ao inserir usuário admin:', err.message);
                        reject(err);
                    } else {
                        console.log('Usuário administrador criado com sucesso.');
                        closeDatabase(db, resolve, reject);
                    }
                });
            });
        } else {
            console.log('Usuário administrador já existe.');
            closeDatabase(db, resolve, reject);
        }
    });
}

function closeDatabase(db, resolve, reject) {
    db.close((err) => {
        if (err) {
            console.error('Erro ao fechar o banco de dados:', err.message);
            reject(err);
        } else {
            console.log('Conexão com o banco de dados fechada.');
            resolve();
        }
    });
}

module.exports = initializeDatabase;

if (require.main === module) {
    initializeDatabase()
        .then(() => {
            console.log('Banco de dados inicializado com sucesso!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Erro ao inicializar banco de dados:', error);
            process.exit(1);
        });
}
