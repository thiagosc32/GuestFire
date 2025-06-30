const getDatabase = require('../config/database');

async function initAnnouncementsTables() {
    const db = getDatabase();
    
    try {
        console.log('🔧 Criando tabelas para anúncios e notificações...');
        
        // Tabela de anúncios
        await db.run(`
            CREATE TABLE IF NOT EXISTS announcements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('general', 'prayer', 'event', 'maintenance')),
                priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
                target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'admins', 'users')),
                status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admin_id) REFERENCES users(id)
            )
        `);
        console.log('✅ Tabela announcements criada');
        
        // Tabela de mensagens administrativas
        await db.run(`
            CREATE TABLE IF NOT EXISTS admin_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER NOT NULL,
                recipient_type TEXT NOT NULL CHECK (recipient_type IN ('all', 'specific', 'admins')),
                recipient_id INTEGER NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'delivered')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admin_id) REFERENCES users(id),
                FOREIGN KEY (recipient_id) REFERENCES users(id)
            )
        `);
        console.log('✅ Tabela admin_messages criada');
        
        // Tabela de notificações
        await db.run(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('announcement', 'message', 'prayer', 'system', 'reminder')),
                is_read BOOLEAN NOT NULL DEFAULT 0,
                read_at DATETIME NULL,
                related_id INTEGER NULL,
                related_type TEXT NULL CHECK (related_type IN ('announcement', 'admin_message', 'prayer_request', 'system')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        console.log('✅ Tabela notifications criada');
        
        // Criar índices para melhor performance
        await db.run('CREATE INDEX IF NOT EXISTS idx_announcements_admin_id ON announcements(admin_id)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(type)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at)');
        
        await db.run('CREATE INDEX IF NOT EXISTS idx_admin_messages_admin_id ON admin_messages(admin_id)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_admin_messages_recipient_id ON admin_messages(recipient_id)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_admin_messages_created_at ON admin_messages(created_at)');
        
        await db.run('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)');
        
        console.log('✅ Índices criados');
        
        // Inserir alguns dados de exemplo
        console.log('📝 Inserindo dados de exemplo...');
        
        // Buscar um administrador para usar como exemplo
        const admin = await db.get('SELECT id FROM users WHERE admin_level >= 1 LIMIT 1');
        
        if (admin) {
            // Anúncio de exemplo
            await db.run(`
                INSERT OR IGNORE INTO announcements (admin_id, title, content, type, priority, target_audience)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                admin.id,
                'Bem-vindos ao Sistema de Oração',
                'Estamos felizes em ter você conosco! Este é um espaço seguro para compartilhar pedidos de oração e fortalecer nossa comunidade de fé.',
                'general',
                'medium',
                'all'
            ]);
            
            // Buscar todos os usuários ativos para criar notificações de exemplo
            const users = await db.all('SELECT id FROM users WHERE is_active = 1');
            
            for (const user of users) {
                await db.run(`
                    INSERT OR IGNORE INTO notifications (user_id, title, message, type, related_type)
                    VALUES (?, ?, ?, ?, ?)
                `, [
                    user.id,
                    'Bem-vindos ao Sistema de Oração',
                    'Estamos felizes em ter você conosco! Este é um espaço seguro para compartilhar pedidos de oração...',
                    'announcement',
                    'announcement'
                ]);
            }
            
            console.log('✅ Dados de exemplo inseridos');
        } else {
            console.log('⚠️ Nenhum administrador encontrado. Dados de exemplo não foram inseridos.');
        }
        
        console.log('🎉 Tabelas de anúncios e notificações inicializadas com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao criar tabelas:', error);
        throw error;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    initAnnouncementsTables()
        .then(() => {
            console.log('✅ Inicialização concluída');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Erro na inicialização:', error);
            process.exit(1);
        });
}

module.exports = initAnnouncementsTables;