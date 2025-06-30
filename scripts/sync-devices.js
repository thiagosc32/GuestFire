const fs = require('fs');
const path = require('path');
const getDatabase = require('../config/database');

// Script para criar tabelas de sincronização entre dispositivos
async function createDeviceSyncTables() {
    const db = getDatabase();
    
    try {
        // Tabela para gerenciar dispositivos dos usuários
        const createDevicesTable = `
            CREATE TABLE IF NOT EXISTS user_devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                device_id TEXT UNIQUE NOT NULL,
                device_name TEXT NOT NULL,
                device_type TEXT NOT NULL, -- 'mobile', 'desktop', 'tablet'
                browser_info TEXT,
                ip_address TEXT,
                last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;
        
        // Tabela para sessões ativas por dispositivo
        const createDeviceSessionsTable = `
            CREATE TABLE IF NOT EXISTS device_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                device_id TEXT NOT NULL,
                session_token TEXT UNIQUE NOT NULL,
                refresh_token TEXT UNIQUE,
                expires_at DATETIME NOT NULL,
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (device_id) REFERENCES user_devices (device_id) ON DELETE CASCADE
            )
        `;
        
        // Tabela para sincronização de dados entre dispositivos
        const createSyncDataTable = `
            CREATE TABLE IF NOT EXISTS sync_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                data_type TEXT NOT NULL, -- 'profile', 'settings', 'preferences'
                data_key TEXT NOT NULL,
                data_value TEXT,
                device_id TEXT, -- dispositivo que fez a última alteração
                version INTEGER DEFAULT 1,
                last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id, data_type, data_key)
            )
        `;
        
        // Tabela para notificações push entre dispositivos
        const createSyncNotificationsTable = `
            CREATE TABLE IF NOT EXISTS sync_notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                target_device_id TEXT, -- NULL para todos os dispositivos
                notification_type TEXT NOT NULL, -- 'profile_update', 'password_change', 'logout_all'
                message TEXT,
                data TEXT, -- JSON com dados adicionais
                is_read BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;
        
        // Executa as criações das tabelas
        await db.run(createDevicesTable);
        console.log('✅ Tabela user_devices criada com sucesso.');
        
        await db.run(createDeviceSessionsTable);
        console.log('✅ Tabela device_sessions criada com sucesso.');
        
        await db.run(createSyncDataTable);
        console.log('✅ Tabela sync_data criada com sucesso.');
        
        await db.run(createSyncNotificationsTable);
        console.log('✅ Tabela sync_notifications criada com sucesso.');
        
        console.log('\n🎉 Sistema de sincronização entre dispositivos configurado com sucesso!');
        console.log('\n📱 Funcionalidades disponíveis:');
        console.log('   • Gerenciamento de múltiplos dispositivos por usuário');
        console.log('   • Sessões independentes por dispositivo');
        console.log('   • Sincronização automática de dados');
        console.log('   • Notificações entre dispositivos');
        console.log('   • Controle de atividade e última sincronização');
        
    } catch (error) {
        console.error('❌ Erro ao criar tabelas de sincronização:', error.message);
        throw error;
    }
}

// Executa o script se chamado diretamente
if (require.main === module) {
    createDeviceSyncTables()
        .then(() => {
            console.log('\n✅ Script executado com sucesso!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Erro na execução:', error);
            process.exit(1);
        });
}

module.exports = { createDeviceSyncTables };