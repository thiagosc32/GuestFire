const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conecta ao banco de dados
const dbPath = path.join(__dirname, 'database', 'users.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando banco de dados...');
console.log('📍 Caminho do banco:', dbPath);

db.serialize(() => {
    // Lista todas as tabelas
    db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, tables) => {
        if (err) {
            console.error('❌ Erro ao listar tabelas:', err.message);
            db.close();
            return;
        }
        
        console.log('📋 Tabelas encontradas:', tables.map(t => t.name));
        
        // Verifica tabela prayer_requests
        if (tables.find(t => t.name === 'prayer_requests')) {
            console.log('\n✅ Tabela prayer_requests encontrada!');
            
            // Conta pedidos existentes
            db.get('SELECT COUNT(*) as count FROM prayer_requests', (err, result) => {
                if (err) {
                    console.error('❌ Erro ao contar pedidos:', err.message);
                } else {
                    console.log('📊 Total de pedidos de oração:', result.count);
                    
                    if (result.count === 0) {
                        console.log('\n➕ Adicionando dados de teste...');
                        
                        // Adiciona dados de teste
                        const samplePrayers = [
                            {
                                user_id: 1,
                                category: 'Saúde',
                                description: 'Oração pela recuperação de um familiar doente',
                                status: 'ativo'
                            },
                            {
                                user_id: 1,
                                category: 'Família',
                                description: 'Pedido de oração pela harmonia familiar',
                                status: 'em_oracao'
                            },
                            {
                                user_id: 1,
                                category: 'Trabalho',
                                description: 'Oração por uma nova oportunidade de emprego',
                                status: 'ativo'
                            },
                            {
                                user_id: 1,
                                category: 'Espiritual',
                                description: 'Pedido de crescimento espiritual e sabedoria',
                                status: 'respondido'
                            },
                            {
                                user_id: 1,
                                category: 'Saúde',
                                description: 'Oração pela cura de ansiedade e depressão',
                                status: 'em_oracao'
                            }
                        ];
                        
                        const stmt = db.prepare(`
                            INSERT INTO prayer_requests (user_id, category, description, status, created_at, updated_at)
                            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
                        `);
                        
                        samplePrayers.forEach(prayer => {
                            stmt.run(prayer.user_id, prayer.category, prayer.description, prayer.status);
                        });
                        
                        stmt.finalize(() => {
                            console.log('✅ Dados de teste adicionados com sucesso!');
                            
                            // Verifica os dados inseridos
                            db.all('SELECT * FROM prayer_requests ORDER BY created_at DESC', (err, prayers) => {
                                if (!err) {
                                    console.log('\n📋 Pedidos de oração cadastrados:');
                                    prayers.forEach(prayer => {
                                        console.log(`- ${prayer.category}: ${prayer.description.substring(0, 50)}... [${prayer.status}]`);
                                    });
                                }
                                db.close();
                            });
                        });
                    } else {
                        // Mostra pedidos existentes
                        db.all('SELECT * FROM prayer_requests ORDER BY created_at DESC LIMIT 5', (err, prayers) => {
                            if (!err) {
                                console.log('\n📋 Últimos pedidos de oração:');
                                prayers.forEach(prayer => {
                                    console.log(`- ${prayer.category}: ${prayer.description.substring(0, 50)}... [${prayer.status}]`);
                                });
                            }
                            db.close();
                        });
                    }
                }
            });
        } else {
            console.log('❌ Tabela prayer_requests não encontrada!');
            console.log('💡 Execute o script de inicialização do banco de dados primeiro.');
            db.close();
        }
    });
});

db.on('error', (err) => {
    console.error('❌ Erro no banco de dados:', err.message);
});