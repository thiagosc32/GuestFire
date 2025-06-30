const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectar ao banco de dados
const dbPath = path.join(__dirname, 'database', 'users.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Adicionando dados de exemplo para pedidos de oração...');

// Dados de exemplo para pedidos de oração
const samplePrayers = [
    {
        user_id: 1,
        category: 'Saúde',
        description: 'Peço oração pela recuperação da minha mãe que está internada no hospital.',
        status: 'pending'
    },
    {
        user_id: 1,
        category: 'Família',
        description: 'Oro pela reconciliação da minha família e pela paz em nosso lar.',
        status: 'praying'
    },
    {
        user_id: 1,
        category: 'Trabalho',
        description: 'Peço oração para encontrar um novo emprego e provisão financeira.',
        status: 'pending'
    },
    {
        user_id: 1,
        category: 'Espiritual',
        description: 'Oro por crescimento espiritual e maior intimidade com Deus.',
        status: 'answered'
    },
    {
        user_id: 1,
        category: 'Saúde',
        description: 'Peço oração pela cura de uma doença crônica que tenho enfrentado.',
        status: 'praying'
    },
    {
        user_id: 1,
        category: 'Relacionamentos',
        description: 'Oro por sabedoria em um relacionamento importante em minha vida.',
        status: 'cancelled'
    },
    {
        user_id: 1,
        category: 'Ministério',
        description: 'Peço oração pelo ministério da igreja e pelos líderes espirituais.',
        status: 'answered'
    },
    {
        user_id: 1,
        category: 'Estudos',
        description: 'Oro por sabedoria e concentração nos estudos universitários.',
        status: 'pending'
    }
];

// Função para inserir os dados
function insertSampleData() {
    const stmt = db.prepare(`
        INSERT INTO prayer_requests (user_id, category, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now', '-' || ? || ' days'), datetime('now', '-' || ? || ' days'))
    `);
    
    samplePrayers.forEach((prayer, index) => {
        const daysAgo = Math.floor(Math.random() * 30) + 1; // Entre 1 e 30 dias atrás
        stmt.run(
            prayer.user_id,
            prayer.category,
            prayer.description,
            prayer.status,
            daysAgo,
            daysAgo
        );
    });
    
    stmt.finalize((err) => {
        if (err) {
            console.error('❌ Erro ao inserir dados de exemplo:', err.message);
        } else {
            console.log('✅ Dados de exemplo inseridos com sucesso!');
            console.log(`📊 ${samplePrayers.length} pedidos de oração adicionados.`);
        }
        
        // Fechar conexão
        db.close((err) => {
            if (err) {
                console.error('❌ Erro ao fechar o banco de dados:', err.message);
            } else {
                console.log('✅ Conexão com o banco de dados fechada.');
                console.log('🎉 Operação concluída!');
            }
        });
    });
}

// Verificar se já existem dados na tabela
db.get('SELECT COUNT(*) as count FROM prayer_requests', (err, row) => {
    if (err) {
        console.error('❌ Erro ao verificar dados existentes:', err.message);
        return;
    }
    
    if (row.count > 0) {
        console.log(`ℹ️ Já existem ${row.count} pedidos na tabela. Adicionando mais dados de exemplo...`);
    } else {
        console.log('📝 Tabela vazia. Inserindo dados de exemplo...');
    }
    
    insertSampleData();
});