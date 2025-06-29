const getDatabase = require('./config/database');

async function upgradeToSuperAdmin() {
    try {
        console.log('🔧 Atualizando nível de administrador...');
        
        const db = getDatabase();
        
        // Atualiza o admin_level de thiagosc31@hotmail.com para 2 (Super Administrador)
        const result = await db.run(
            'UPDATE users SET admin_level = 2, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
            ['thiagosc31@hotmail.com']
        );
        
        if (result.changes === 0) {
            console.log('❌ Usuário não encontrado!');
            return;
        }
        
        // Verifica a atualização
        const user = await db.get(
            'SELECT id, full_name, email, admin_level FROM users WHERE email = ?',
            ['thiagosc31@hotmail.com']
        );
        
        console.log('✅ Usuário atualizado com sucesso!');
        console.log('📋 Dados atualizados:');
        console.table([user]);
        
        console.log('\n🎯 Níveis de administrador:');
        console.log('0 = Usuário comum');
        console.log('1 = Administrador');
        console.log('2 = Super Administrador (pode alterar níveis)');
        
    } catch (error) {
        console.error('❌ Erro ao atualizar administrador:', error);
    }
}

upgradeToSuperAdmin();