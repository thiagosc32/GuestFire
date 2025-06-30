const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const getDatabase = require('../config/database');
const router = express.Router();

// Middleware para autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token de acesso requerido'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'seu_jwt_secret_aqui', (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Token inválido'
            });
        }
        req.user = user;
        next();
    });
};

// Função para gerar ID único do dispositivo
function generateDeviceId(userAgent, ipAddress) {
    const hash = crypto.createHash('sha256');
    hash.update(userAgent + ipAddress + Date.now().toString());
    return hash.digest('hex').substring(0, 32);
}

// Registrar/Atualizar dispositivo
router.post('/register-device', authenticateToken, async (req, res) => {
    try {
        const { deviceName, deviceType, browserInfo } = req.body;
        const userId = req.user.userId;
        const ipAddress = req.ip;
        const userAgent = req.get('User-Agent');
        
        // Gera um ID único para o dispositivo
        const deviceId = generateDeviceId(userAgent, ipAddress);
        
        const db = getDatabase();
        
        // Verifica se o dispositivo já existe
        const existingDevice = await db.get(
            'SELECT * FROM user_devices WHERE user_id = ? AND device_id = ?',
            [userId, deviceId]
        );
        
        if (existingDevice) {
            // Atualiza dispositivo existente
            await db.run(
                `UPDATE user_devices SET 
                 device_name = ?, device_type = ?, browser_info = ?, 
                 ip_address = ?, last_sync = CURRENT_TIMESTAMP, is_active = 1
                 WHERE user_id = ? AND device_id = ?`,
                [deviceName, deviceType, browserInfo, ipAddress, userId, deviceId]
            );
        } else {
            // Registra novo dispositivo
            await db.run(
                `INSERT INTO user_devices 
                 (user_id, device_id, device_name, device_type, browser_info, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, deviceId, deviceName, deviceType, browserInfo, ipAddress]
            );
        }
        
        res.json({
            success: true,
            message: 'Dispositivo registrado com sucesso',
            data: { deviceId }
        });
        
    } catch (error) {
        console.error('Erro ao registrar dispositivo:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Listar dispositivos do usuário
router.get('/devices', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const db = getDatabase();
        
        const devices = await db.all(
            `SELECT d.*, ds.last_activity, ds.is_active as session_active
             FROM user_devices d
             LEFT JOIN device_sessions ds ON d.device_id = ds.device_id AND ds.is_active = 1
             WHERE d.user_id = ? AND d.is_active = 1
             ORDER BY d.last_sync DESC`,
            [userId]
        );
        
        res.json({
            success: true,
            data: { devices }
        });
        
    } catch (error) {
        console.error('Erro ao listar dispositivos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Sincronizar dados entre dispositivos
router.post('/sync-data', authenticateToken, async (req, res) => {
    try {
        const { dataType, dataKey, dataValue, deviceId } = req.body;
        const userId = req.user.userId;
        const db = getDatabase();
        
        // Atualiza ou insere dados de sincronização
        await db.run(
            `INSERT OR REPLACE INTO sync_data 
             (user_id, data_type, data_key, data_value, device_id, version, last_modified)
             VALUES (?, ?, ?, ?, ?, 
                     COALESCE((SELECT version + 1 FROM sync_data WHERE user_id = ? AND data_type = ? AND data_key = ?), 1),
                     CURRENT_TIMESTAMP)`,
            [userId, dataType, dataKey, dataValue, deviceId, userId, dataType, dataKey]
        );
        
        // Cria notificação para outros dispositivos
        await db.run(
            `INSERT INTO sync_notifications 
             (user_id, notification_type, message, data)
             VALUES (?, 'data_sync', 'Dados sincronizados', ?)`,
            [userId, JSON.stringify({ dataType, dataKey, deviceId })]
        );
        
        res.json({
            success: true,
            message: 'Dados sincronizados com sucesso'
        });
        
    } catch (error) {
        console.error('Erro ao sincronizar dados:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Obter dados sincronizados
router.get('/sync-data', authenticateToken, async (req, res) => {
    try {
        const { dataType, since } = req.query;
        const userId = req.user.userId;
        const db = getDatabase();
        
        let query = 'SELECT * FROM sync_data WHERE user_id = ?';
        let params = [userId];
        
        if (dataType) {
            query += ' AND data_type = ?';
            params.push(dataType);
        }
        
        if (since) {
            query += ' AND last_modified > ?';
            params.push(since);
        }
        
        query += ' ORDER BY last_modified DESC';
        
        const syncData = await db.all(query, params);
        
        res.json({
            success: true,
            data: { syncData }
        });
        
    } catch (error) {
        console.error('Erro ao obter dados sincronizados:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Obter notificações de sincronização
router.get('/notifications', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const db = getDatabase();
        
        const notifications = await db.all(
            `SELECT * FROM sync_notifications 
             WHERE user_id = ? AND is_read = 0
             ORDER BY created_at DESC LIMIT 50`,
            [userId]
        );
        
        res.json({
            success: true,
            data: { notifications }
        });
        
    } catch (error) {
        console.error('Erro ao obter notificações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Marcar notificações como lidas
router.put('/notifications/read', authenticateToken, async (req, res) => {
    try {
        const { notificationIds } = req.body;
        const userId = req.user.userId;
        const db = getDatabase();
        
        if (notificationIds && notificationIds.length > 0) {
            const placeholders = notificationIds.map(() => '?').join(',');
            await db.run(
                `UPDATE sync_notifications SET is_read = 1 
                 WHERE user_id = ? AND id IN (${placeholders})`,
                [userId, ...notificationIds]
            );
        } else {
            // Marca todas como lidas
            await db.run(
                'UPDATE sync_notifications SET is_read = 1 WHERE user_id = ?',
                [userId]
            );
        }
        
        res.json({
            success: true,
            message: 'Notificações marcadas como lidas'
        });
        
    } catch (error) {
        console.error('Erro ao marcar notificações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Desconectar dispositivo
router.delete('/devices/:deviceId', authenticateToken, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const userId = req.user.userId;
        const db = getDatabase();
        
        // Desativa o dispositivo
        await db.run(
            'UPDATE user_devices SET is_active = 0 WHERE user_id = ? AND device_id = ?',
            [userId, deviceId]
        );
        
        // Desativa sessões do dispositivo
        await db.run(
            'UPDATE device_sessions SET is_active = 0 WHERE user_id = ? AND device_id = ?',
            [userId, deviceId]
        );
        
        res.json({
            success: true,
            message: 'Dispositivo desconectado com sucesso'
        });
        
    } catch (error) {
        console.error('Erro ao desconectar dispositivo:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Desconectar todos os dispositivos (exceto o atual)
router.post('/logout-all-devices', authenticateToken, async (req, res) => {
    try {
        const { currentDeviceId } = req.body;
        const userId = req.user.userId;
        const db = getDatabase();
        
        // Desativa todas as sessões exceto a atual
        if (currentDeviceId) {
            await db.run(
                'UPDATE device_sessions SET is_active = 0 WHERE user_id = ? AND device_id != ?',
                [userId, currentDeviceId]
            );
        } else {
            await db.run(
                'UPDATE device_sessions SET is_active = 0 WHERE user_id = ?',
                [userId]
            );
        }
        
        // Cria notificação para outros dispositivos
        await db.run(
            `INSERT INTO sync_notifications 
             (user_id, notification_type, message)
             VALUES (?, 'logout_all', 'Sessão encerrada em todos os dispositivos')`,
            [userId]
        );
        
        res.json({
            success: true,
            message: 'Logout realizado em todos os dispositivos'
        });
        
    } catch (error) {
        console.error('Erro ao fazer logout em todos os dispositivos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

module.exports = router;