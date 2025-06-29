const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectar ao banco de dados
const dbPath = path.join(__dirname, 'database', 'users.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Adicionando coluna show_prayer_content na tabela testimonies...');

// Adicionar a coluna show_prayer_content
db.run('ALTER TABLE testimonies ADD COLUMN show_prayer_content INTEGER DEFAULT 1', function(err) {
    if (err) {
        if (err.message.includes('duplicate column')) {
            console.log('✅ Coluna show_prayer_content já existe na tabela testimonies.');
        } else {
            console.error('❌ Erro ao adicionar coluna show_prayer_content:', err.message);
        }
    } else {
        console.log('✅ Coluna show_prayer_content adicionada com sucesso na tabela testimonies.');
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