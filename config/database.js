const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'users.db');
        this.init();
    }

    init() {
        // Cria o diretório database se não existir
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // Conecta ao banco de dados
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('❌ Erro ao conectar com o banco de dados:', err.message);
                throw err;
            }
            console.log('✅ Conectado ao banco de dados SQLite.');
        });

        // Habilita foreign keys
        this.db.run('PRAGMA foreign_keys = ON');
    }

    // Método para executar queries
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('❌ Erro na query:', err.message);
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // Método para buscar um registro
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('❌ Erro na query:', err.message);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Método para buscar múltiplos registros
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('❌ Erro na query:', err.message);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Método para fechar a conexão
    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ Erro ao fechar o banco de dados:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Conexão com o banco de dados fechada.');
                    resolve();
                }
            });
        });
    }

    // Método para executar transações
    async transaction(callback) {
        try {
            await this.run('BEGIN TRANSACTION');
            const result = await callback(this);
            await this.run('COMMIT');
            return result;
        } catch (error) {
            await this.run('ROLLBACK');
            throw error;
        }
    }
}

// Singleton para garantir uma única instância
let dbInstance = null;

function getDatabase() {
    if (!dbInstance) {
        dbInstance = new Database();
    }
    return dbInstance;
}

module.exports = getDatabase;