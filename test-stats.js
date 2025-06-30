const getDatabase = require('./config/database');

async function testStats() {
    try {
        const db = getDatabase();
        
        console.log('🔍 Testando conexão com o banco de dados...');
        
        // Verificar tabelas existentes
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('📋 Tabelas encontradas:', tables.map(t => t.name));
        
        // Verificar se a tabela prayer_requests existe
        const prayerTable = tables.find(t => t.name === 'prayer_requests');
        if (!prayerTable) {
            console.log('❌ Tabela prayer_requests não encontrada!');
            return;
        }
        
        // Verificar estrutura da tabela prayer_requests
        const columns = await db.all("PRAGMA table_info(prayer_requests)");
        console.log('📊 Colunas da tabela prayer_requests:');
        columns.forEach(col => {
            console.log(`  - ${col.name} (${col.type})`);
        });
        
        // Verificar dados na tabela
        const totalRequests = await db.get('SELECT COUNT(*) as count FROM prayer_requests');
        console.log(`\n📈 Total de pedidos de oração: ${totalRequests.count}`);
        
        if (totalRequests.count > 0) {
            // Verificar status únicos
            const statuses = await db.all('SELECT DISTINCT status FROM prayer_requests');
            console.log('🏷️  Status encontrados:', statuses.map(s => s.status));
            
            // Contar por status
            const statusCounts = await db.all(`
                SELECT status, COUNT(*) as count 
                FROM prayer_requests 
                GROUP BY status
            `);
            console.log('\n📊 Contagem por status:');
            statusCounts.forEach(s => {
                console.log(`  - ${s.status}: ${s.count}`);
            });
            
            // Testar as consultas específicas da API
            console.log('\n🧪 Testando consultas da API:');
            
            const activeCount = await db.get('SELECT COUNT(*) as count FROM prayer_requests WHERE status = "ativo"');
            console.log(`  - Aguardando Oração: ${activeCount.count}`);
            
            const prayingCount = await db.get('SELECT COUNT(*) as count FROM prayer_requests WHERE status = "em_oracao"');
            console.log(`  - Em oração: ${prayingCount.count}`);
            
            const answeredCount = await db.get('SELECT COUNT(*) as count FROM prayer_requests WHERE status = "respondido"');
            console.log(`  - Respondidos: ${answeredCount.count}`);
            
            const cancelledCount = await db.get('SELECT COUNT(*) as count FROM prayer_requests WHERE status = "cancelado"');
            console.log(`  - Cancelados: ${cancelledCount.count}`);
        } else {
            console.log('⚠️  Nenhum pedido de oração encontrado na tabela.');
        }
        
        console.log('\n✅ Teste concluído com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao testar estatísticas:', error);
    }
}

testStats();