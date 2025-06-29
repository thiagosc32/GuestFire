const getDatabase = require('./config/database');

async function testPrayerTable() {
    try {
        const db = getDatabase();
        
        // Verifica se a tabela prayer_requests existe
        const tableExists = await db.get(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='prayer_requests'"
        );
        
        if (tableExists) {
            console.log('✅ Tabela prayer_requests existe');
            
            // Conta os registros
            const count = await db.get('SELECT COUNT(*) as count FROM prayer_requests');
            console.log(`📊 Total de pedidos de oração: ${count.count}`);
            
            // Mostra alguns registros se existirem
            if (count.count > 0) {
                const samples = await db.all('SELECT * FROM prayer_requests LIMIT 5');
                console.log('\n📋 Primeiros registros:');
                samples.forEach((prayer, index) => {
                    console.log(`${index + 1}. ID: ${prayer.id}, Título: ${prayer.title}, Status: ${prayer.status}`);
                });
            } else {
                console.log('📝 Nenhum pedido de oração encontrado na tabela');
            }
        } else {
            console.log('❌ Tabela prayer_requests não existe');
            console.log('💡 Execute a rota /api/users/admin/init-database para criar as tabelas');
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar tabela:', error.message);
    }
}

testPrayerTable();