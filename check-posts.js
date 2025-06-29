const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'users.db');
const db = new sqlite3.Database(dbPath);

console.log('Verificando posts no banco de dados...');
console.log('='.repeat(50));

db.all('SELECT id, type, content, created_at FROM feed_posts ORDER BY created_at DESC LIMIT 10', (err, rows) => {
    if (err) {
        console.error('Erro ao consultar banco:', err);
    } else {
        console.log(`Encontrados ${rows.length} posts:`);
        console.log('\nPosts encontrados:');
        rows.forEach((row, index) => {
            console.log(`\n${index + 1}. Post ID: ${row.id}`);
            console.log(`   Tipo: ${row.type}`);
            console.log(`   Conteúdo: ${row.content.substring(0, 100)}${row.content.length > 100 ? '...' : ''}`);
            console.log(`   Criado em: ${row.created_at}`);
        });
        
        // Verificar tipos únicos
        const tipos = [...new Set(rows.map(row => row.type))];
        console.log('\n='.repeat(50));
        console.log('Tipos de posts encontrados:', tipos.join(', '));
    }
    db.close();
    console.log('\nConsulta finalizada.');
});