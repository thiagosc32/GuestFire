const getDatabase = require('../config/database');

async function addSocialAuthColumns() {
    try {
        console.log('🔄 Adicionando colunas para autenticação social...');
        
        const db = await getDatabase();
        
        // Função para verificar se uma coluna existe
        async function columnExists(tableName, columnName) {
            try {
                const result = await db.all(`PRAGMA table_info(${tableName})`);
                return result.some(column => column.name === columnName);
            } catch (error) {
                console.error(`Erro ao verificar coluna ${columnName}:`, error);
                return false;
            }
        }

        // Lista de colunas para adicionar
        const columnsToAdd = [
            { name: 'google_id', type: 'TEXT' },
            { name: 'facebook_id', type: 'TEXT' },
            { name: 'github_id', type: 'TEXT' },
            { name: 'apple_id', type: 'TEXT' },
            { name: 'auth_provider', type: 'TEXT DEFAULT "local"' }
        ];
        
        // Adicionar cada coluna
        for (const column of columnsToAdd) {
            try {
                if (await columnExists('users', column.name)) {
                    console.log(`⚠️ Coluna ${column.name} já existe, pulando...`);
                    continue;
                }
                
                await db.run(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
                console.log(`✅ Coluna ${column.name} adicionada com sucesso`);
            } catch (error) {
                console.error(`❌ Erro ao adicionar coluna ${column.name}:`, error.message);
                throw error;
            }
        }
        
        // Criar índices para melhor performance
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)',
            'CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id)',
            'CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id)',
            'CREATE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id)',
            'CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider)'
        ];
        
        for (const indexSQL of indexes) {
            await new Promise((resolve, reject) => {
                db.run(indexSQL, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
        
        console.log('✅ Índices criados com sucesso');
        console.log('🎉 Colunas para autenticação social adicionadas com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao adicionar colunas:', error.message);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    addSocialAuthColumns();
}

module.exports = addSocialAuthColumns;