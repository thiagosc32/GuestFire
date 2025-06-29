const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const getDatabase = require('../config/database');
const router = express.Router();

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'profile-pictures');
        // Cria o diretório se não existir
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Nome do arquivo: userId_timestamp.extensão
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `user_${req.user.userId}_${uniqueSuffix}${extension}`);
    }
});

// Filtro para aceitar múltiplos formatos de imagem
const fileFilter = (req, file, cb) => {
    // Formatos de imagem suportados
    const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/tiff',
        'image/svg+xml'
    ];
    
    // Extensões permitidas (validação adicional)
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        const supportedFormats = 'JPEG, PNG, GIF, WebP, BMP, TIFF, SVG';
        cb(new Error(`Formato não suportado! Formatos aceitos: ${supportedFormats}`), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Middleware para verificar token JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token de acesso requerido'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
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

// Rota para obter perfil do usuário
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const dbInstance = getDatabase();
        const user = await dbInstance.get(
            'SELECT id, full_name, email, is_active, admin_level, profile_picture, created_at FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    fullName: user.full_name,
                    email: user.email,
                    isActive: user.is_active,
                    adminLevel: user.admin_level,
                    profilePicture: user.profile_picture,
                    createdAt: user.created_at
                }
            }
        });

    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Validação para atualização de perfil
const validateProfileUpdate = [
    body('fullName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nome deve ter entre 2 e 100 caracteres')
        .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
        .withMessage('Nome deve conter apenas letras e espaços'),
    
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Email deve ser válido')
];

// Rota para atualizar perfil do usuário
router.put('/profile', authenticateToken, validateProfileUpdate, async (req, res) => {
    try {
        // Verifica erros de validação
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: errors.array()
            });
        }

        const { fullName, email } = req.body;
        const dbInstance = getDatabase();

        // Se email foi fornecido, verifica se já existe
        if (email) {
            const existingUser = await dbInstance.get(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, req.user.userId]
            );

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'Email já está em uso por outro usuário'
                });
            }
        }

        // Constrói a query de atualização dinamicamente
        const updates = [];
        const values = [];

        if (fullName) {
            updates.push('full_name = ?');
            values.push(fullName);
        }

        if (email) {
            updates.push('email = ?');
            values.push(email);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum campo para atualizar foi fornecido'
            });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(req.user.userId);

        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        await dbInstance.run(sql, values);

        // Busca os dados atualizados
        const updatedUser = await dbInstance.get(
            'SELECT id, full_name, email, is_active, created_at, updated_at FROM users WHERE id = ?',
            [req.user.userId]
        );

        res.json({
            success: true,
            message: 'Perfil atualizado com sucesso',
            data: {
                user: {
                    id: updatedUser.id,
                    fullName: updatedUser.full_name,
                    email: updatedUser.email,
                    isActive: updatedUser.is_active,
                    createdAt: updatedUser.created_at,
                    updatedAt: updatedUser.updated_at
                }
            }
        });

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Validação para mudança de senha
const validatePasswordChange = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Senha atual é obrigatória'),
    
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('Nova senha deve ter pelo menos 6 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Nova senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
    
    body('confirmNewPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Confirmação da nova senha não confere');
            }
            return true;
        })
];

// Rota para alterar senha
router.put('/change-password', authenticateToken, validatePasswordChange, async (req, res) => {
    try {
        // Verifica erros de validação
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;
        const dbInstance = getDatabase();

        // Busca a senha atual do usuário
        const user = await dbInstance.get(
            'SELECT password_hash FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Verifica a senha atual
        const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Senha atual incorreta'
            });
        }

        // Hash da nova senha
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Atualiza a senha
        await dbInstance.run(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newPasswordHash, req.user.userId]
        );

        res.json({
            success: true,
            message: 'Senha alterada com sucesso'
        });

    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para obter histórico de logins do usuário
router.get('/login-history', authenticateToken, async (req, res) => {
    try {
        const dbInstance = getDatabase();
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const loginHistory = await dbInstance.all(
            `SELECT success, ip_address, user_agent, created_at 
             FROM login_logs 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [req.user.userId, limit, offset]
        );

        res.json({
            success: true,
            data: {
                loginHistory: loginHistory.map(log => ({
                    success: log.success,
                    ipAddress: log.ip_address,
                    userAgent: log.user_agent,
                    createdAt: log.created_at
                })),
                pagination: {
                    limit,
                    offset
                }
            }
        });

    } catch (error) {
        console.error('Erro ao buscar histórico de logins:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Middleware para verificar se é administrador (nível 1 ou superior)
const requireAdmin = async (req, res, next) => {
    try {
        const dbInstance = getDatabase();
        const user = await dbInstance.get(
            'SELECT admin_level FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (!user || user.admin_level < 1) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas administradores podem acessar esta funcionalidade.'
            });
        }

        req.user.adminLevel = user.admin_level;
        next();
    } catch (error) {
        console.error('Erro ao verificar permissões de admin:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Middleware para verificar se é super administrador (nível 2)
const requireSuperAdmin = async (req, res, next) => {
    try {
        const dbInstance = getDatabase();
        const user = await dbInstance.get(
            'SELECT admin_level FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (!user || user.admin_level < 2) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas super administradores podem acessar esta funcionalidade.'
            });
        }

        req.user.adminLevel = user.admin_level;
        next();
    } catch (error) {
        console.error('Erro ao verificar permissões de super admin:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// ROTAS ADMINISTRATIVAS

// Rota para listar todos os usuários (apenas admin)
router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const dbInstance = getDatabase();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        let whereClause = '';
        let params = [];

        if (search) {
            whereClause = 'WHERE full_name LIKE ? OR email LIKE ?';
            params = [`%${search}%`, `%${search}%`];
        }

        // Busca usuários com paginação
        const users = await dbInstance.all(
            `SELECT id, full_name, email, is_active, admin_level, created_at, updated_at 
             FROM users 
             ${whereClause}
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        // Conta total de usuários
        const totalResult = await dbInstance.get(
            `SELECT COUNT(*) as total FROM users ${whereClause}`,
            params
        );
        const total = totalResult.total;

        res.json({
            success: true,
            data: {
                users: users.map(user => ({
                    id: user.id,
                    fullName: user.full_name,
                    email: user.email,
                    isActive: user.is_active,
                    adminLevel: user.admin_level,
                    adminLevelName: getAdminLevelName(user.admin_level),
                    createdAt: user.created_at,
                    updatedAt: user.updated_at
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para obter detalhes de um usuário específico (apenas admin)
router.get('/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const dbInstance = getDatabase();
        const userId = req.params.id;

        const user = await dbInstance.get(
            'SELECT id, full_name, email, is_active, admin_level, created_at, updated_at FROM users WHERE id = ?',
            [userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Busca histórico de logins do usuário
        const loginHistory = await dbInstance.all(
            `SELECT success, ip_address, user_agent, created_at 
             FROM login_logs 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 10`,
            [userId]
        );

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    fullName: user.full_name,
                    email: user.email,
                    isActive: user.is_active,
                    adminLevel: user.admin_level,
                    adminLevelName: getAdminLevelName(user.admin_level),
                    createdAt: user.created_at,
                    updatedAt: user.updated_at
                },
                loginHistory: loginHistory.map(log => ({
                    success: log.success,
                    ipAddress: log.ip_address,
                    userAgent: log.user_agent,
                    createdAt: log.created_at
                }))
            }
        });

    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para ativar/desativar usuário (apenas admin)
router.put('/admin/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const dbInstance = getDatabase();
        const userId = req.params.id;
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Status deve ser true ou false'
            });
        }

        // Não permite desativar o próprio admin
        if (userId == req.user.userId) {
            return res.status(400).json({
                success: false,
                message: 'Você não pode alterar o status da sua própria conta'
            });
        }

        await dbInstance.run(
            'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [isActive ? 1 : 0, userId]
        );

        res.json({
            success: true,
            message: `Usuário ${isActive ? 'ativado' : 'desativado'} com sucesso`
        });

    } catch (error) {
        console.error('Erro ao alterar status do usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para deletar usuário (apenas admin)
router.delete('/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const dbInstance = getDatabase();
        const userId = req.params.id;

        // Não permite deletar o próprio admin
        if (userId == req.user.userId) {
            return res.status(400).json({
                success: false,
                message: 'Você não pode deletar sua própria conta'
            });
        }

        // Verifica se o usuário existe
        const user = await dbInstance.get('SELECT id, email FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Não permite deletar o admin padrão
        if (user.email === 'thiagosc31@hotmail.com') {
            return res.status(400).json({
                success: false,
                message: 'Não é possível deletar o administrador padrão'
            });
        }

        // Deleta logs de login do usuário primeiro (devido à foreign key)
        await dbInstance.run('DELETE FROM login_logs WHERE user_id = ?', [userId]);
        
        // Deleta sessões do usuário
        await dbInstance.run('DELETE FROM sessions WHERE user_id = ?', [userId]);
        
        // Deleta o usuário
        await dbInstance.run('DELETE FROM users WHERE id = ?', [userId]);

        res.json({
            success: true,
            message: 'Usuário deletado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para editar usuário (apenas admin)
router.put('/admin/users/:id', authenticateToken, requireAdmin, [
    body('fullName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nome deve ter entre 2 e 100 caracteres')
        .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
        .withMessage('Nome deve conter apenas letras e espaços'),
    
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Email deve ser válido'),
        
    body('password')
        .optional()
        .isLength({ min: 6 })
        .withMessage('Senha deve ter pelo menos 6 caracteres')
], async (req, res) => {
    try {
        // Verifica erros de validação
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: errors.array()
            });
        }

        const dbInstance = getDatabase();
        const userId = req.params.id;
        const { fullName, email, password } = req.body;

        // Verifica se o usuário existe
        const user = await dbInstance.get('SELECT id, email FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Se email foi fornecido, verifica se já existe
        if (email && email !== user.email) {
            const existingUser = await dbInstance.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Este email já está em uso'
                });
            }
        }

        // Prepara os campos para atualização
        let updateFields = [];
        let updateValues = [];

        if (fullName) {
            updateFields.push('full_name = ?');
            updateValues.push(fullName);
        }

        if (email) {
            updateFields.push('email = ?');
            updateValues.push(email);
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.push('password_hash = ?');
            updateValues.push(hashedPassword);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum campo para atualizar foi fornecido'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(userId);

        await dbInstance.run(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        res.json({
            success: true,
            message: 'Usuário atualizado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao editar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para obter pedidos de oração (apenas admin)
router.get('/admin/prayer-requests', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const dbInstance = getDatabase();
        const status = req.query.status;
        
        let query = `SELECT pr.*, u.full_name as userName, u.email as userEmail 
                     FROM prayer_requests pr 
                     LEFT JOIN users u ON pr.user_id = u.id`;
        let params = [];
        
        if (status) {
            query += ' WHERE pr.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY pr.created_at DESC';
        
        const prayerRequests = await dbInstance.all(query, params);
        
        // Converter status para português
        const statusMap = {
            'active': 'ativo',
            'in_prayer': 'em_oracao',
            'answered': 'respondido',
            'cancelled': 'cancelado'
        };
        
        const convertedPrayerRequests = prayerRequests.map(prayer => ({
            ...prayer,
            status: statusMap[prayer.status] || prayer.status
        }));
        

        
        res.json({
            success: true,
            data: convertedPrayerRequests
        });
        
    } catch (error) {
        console.error('Erro ao buscar pedidos de oração:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para atualizar status de pedido de oração (apenas admin)
router.put('/admin/prayer-requests/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const dbInstance = getDatabase();
        const prayerId = req.params.id;
        const { status } = req.body;
        
        // Valida o status
        const validStatuses = ['ativo', 'em_oracao', 'respondido', 'cancelado'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status inválido. Use: ativo, em_oracao, respondido ou cancelado'
            });
        }
        
        // Atualiza o status
        const result = await dbInstance.run(
            'UPDATE prayer_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, prayerId]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pedido de oração não encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Status atualizado com sucesso'
        });
        
    } catch (error) {
        console.error('Erro ao atualizar status do pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para deletar pedido de oração (apenas admin)
router.delete('/admin/prayer-requests/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const dbInstance = getDatabase();
        const prayerId = req.params.id;
        
        const result = await dbInstance.run(
            'DELETE FROM prayer_requests WHERE id = ?',
            [prayerId]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pedido de oração não encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Pedido de oração deletado com sucesso'
        });
        
    } catch (error) {
        console.error('Erro ao deletar pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para obter estatísticas do sistema (apenas admin)
router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const dbInstance = getDatabase();

        // Total de usuários
        const totalUsers = await dbInstance.get('SELECT COUNT(*) as count FROM users');
        
        // Usuários aguardando oração
        const activeUsers = await dbInstance.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
        
        // Usuários criados hoje
        const todayUsers = await dbInstance.get(
            'SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = DATE("now")'
        );
        
        // Usuários criados esta semana
        const weekUsers = await dbInstance.get(
            'SELECT COUNT(*) as count FROM users WHERE created_at >= DATE("now", "-7 days")'
        );
        
        // Total de logins hoje
        const todayLogins = await dbInstance.get(
            'SELECT COUNT(*) as count FROM login_logs WHERE DATE(created_at) = DATE("now") AND success = 1'
        );

        // Total de pedidos de oração (excluindo cancelados)
        const totalPrayerRequests = await dbInstance.get(
            'SELECT COUNT(*) as count FROM prayer_requests WHERE status != "cancelado"'
        );
        
        // Pedidos aguardando oração (status = "ativo")
        const activePrayerRequests = await dbInstance.get(
            'SELECT COUNT(*) as count FROM prayer_requests WHERE status = "ativo"'
        );
        
        // Pedidos em oração (status = "em_oracao")
        const prayingRequests = await dbInstance.get(
            'SELECT COUNT(*) as count FROM prayer_requests WHERE status = "em_oracao"'
        );
        
        // Pedidos respondidos (status = "respondido")
        const answeredRequests = await dbInstance.get(
            'SELECT COUNT(*) as count FROM prayer_requests WHERE status = "respondido"'
        );
        
        // Pedidos cancelados (status = "cancelado")
        const cancelledRequests = await dbInstance.get(
            'SELECT COUNT(*) as count FROM prayer_requests WHERE status = "cancelado"'
        );

        res.json({
            success: true,
            data: {
                totalUsers: totalUsers.count,
                activeUsers: activeUsers.count,
                inactiveUsers: totalUsers.count - activeUsers.count,
                todayUsers: todayUsers.count,
                weekUsers: weekUsers.count,
                todayLogins: todayLogins.count,
                totalPrayerRequests: totalPrayerRequests.count,
                activePrayerRequests: activePrayerRequests.count,
                prayingRequests: prayingRequests.count,
                answeredRequests: answeredRequests.count,
                cancelledRequests: cancelledRequests.count
            }
        });

    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para desativar conta
router.delete('/account', authenticateToken, async (req, res) => {
    try {
        const dbInstance = getDatabase();
        
        // Desativa a conta em vez de deletar
        await dbInstance.run(
            'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [req.user.userId]
        );

        res.json({
            success: true,
            message: 'Conta desativada com sucesso'
        });

    } catch (error) {
        console.error('Erro ao desativar conta:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para visualizar dados de uma tabela específica (apenas admin)
router.get('/admin/database/:tableName', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const dbInstance = getDatabase();
        const tableName = req.params.tableName;
        
        // Lista de tabelas permitidas para segurança
        const allowedTables = ['users', 'sessions', 'login_logs'];
        
        if (!allowedTables.includes(tableName)) {
            return res.status(400).json({
                success: false,
                message: 'Tabela não permitida'
            });
        }
        
        let query;
        switch (tableName) {
            case 'users':
                query = 'SELECT id, full_name, email, is_active, admin_level, created_at, updated_at FROM users ORDER BY created_at DESC';
                break;
            case 'sessions':
                query = 'SELECT id, user_id, expires_at, created_at FROM sessions ORDER BY created_at DESC LIMIT 100';
                break;
            case 'login_logs':
                query = 'SELECT id, user_id, email, success, ip_address, created_at FROM login_logs ORDER BY created_at DESC LIMIT 100';
                break;
        }
        
        const data = await dbInstance.all(query);
        
        res.json({
            success: true,
            data: data,
            message: `Dados da tabela ${tableName} carregados com sucesso`
        });
        
    } catch (error) {
        console.error('Erro ao carregar dados da tabela:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para alterar nível de administrador (apenas super admin)
router.put('/admin/users/:id/admin-level', authenticateToken, requireSuperAdmin, [
    body('adminLevel')
        .isInt({ min: 0, max: 2 })
        .withMessage('Nível de administrador deve ser 0, 1 ou 2')
], async (req, res) => {
    try {
        // Verifica erros de validação
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: errors.array()
            });
        }

        const userId = parseInt(req.params.id);
        const { adminLevel } = req.body;
        const dbInstance = getDatabase();

        // Verifica se o usuário existe
        const targetUser = await dbInstance.get(
            'SELECT id, full_name, email, admin_level FROM users WHERE id = ?',
            [userId]
        );

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Impede que o usuário altere seu próprio nível
        if (userId === req.user.userId) {
            return res.status(400).json({
                success: false,
                message: 'Você não pode alterar seu próprio nível de administrador'
            });
        }

        // Atualiza o nível de administrador
        await dbInstance.run(
            'UPDATE users SET admin_level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [adminLevel, userId]
        );

        // Busca os dados atualizados
        const updatedUser = await dbInstance.get(
            'SELECT id, full_name, email, admin_level FROM users WHERE id = ?',
            [userId]
        );

        res.json({
            success: true,
            message: `Nível de administrador alterado com sucesso para ${getAdminLevelName(adminLevel)}`,
            data: {
                user: {
                    id: updatedUser.id,
                    fullName: updatedUser.full_name,
                    email: updatedUser.email,
                    adminLevel: updatedUser.admin_level,
                    adminLevelName: getAdminLevelName(updatedUser.admin_level)
                }
            }
        });

    } catch (error) {
        console.error('Erro ao alterar nível de administrador:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Função auxiliar para obter o nome do nível de administrador
function getAdminLevelName(level) {
    switch (level) {
        case 0: return 'Usuário';
        case 1: return 'Administrador';
        case 2: return 'Super Administrador';
        default: return 'Desconhecido';
    }
}

// Rota para obter informações sobre níveis de administrador
router.get('/admin/levels', authenticateToken, requireAdmin, (req, res) => {
    res.json({
        success: true,
        data: {
            levels: [
                { value: 0, name: 'Usuário', description: 'Usuário comum sem privilégios administrativos' },
                { value: 1, name: 'Administrador', description: 'Pode gerenciar usuários e visualizar relatórios' },
                { value: 2, name: 'Super Administrador', description: 'Acesso total ao sistema, incluindo alteração de níveis' }
            ],
            currentUserLevel: req.user.adminLevel || 0
        }
    });
});

// Rota para executar script de inicialização do banco (apenas super admin)
router.post('/admin/init-database', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const dbInstance = getDatabase();
        const bcrypt = require('bcryptjs');
        
        // Cria as tabelas se não existirem
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                admin_level INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        const createSessionsTable = `
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;
        
        const createLoginLogsTable = `
            CREATE TABLE IF NOT EXISTS login_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                email TEXT NOT NULL,
                success BOOLEAN NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
            )
        `;
        
        const createPrayerRequestsTable = `
            CREATE TABLE IF NOT EXISTS prayer_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'em_oracao', 'respondido', 'cancelado')),
                is_anonymous BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;
        
        // Executa a criação das tabelas
        await dbInstance.run(createUsersTable);
        await dbInstance.run(createSessionsTable);
        await dbInstance.run(createLoginLogsTable);
        await dbInstance.run(createPrayerRequestsTable);
        
        // Verifica se o usuário admin já existe
        const existingAdmin = await dbInstance.get(
            'SELECT id FROM users WHERE email = ?',
            ['thiagosc31@hotmail.com']
        );
        
        if (!existingAdmin) {
            // Cria usuário administrador padrão
            const adminPassword = bcrypt.hashSync('Janeiro312002', 12);
            await dbInstance.run(
                'INSERT INTO users (full_name, email, password_hash, admin_level) VALUES (?, ?, ?, ?)',
        ['Administrador', 'thiagosc31@hotmail.com', adminPassword, 2]
            );
        }
        
        // Atualiza admin_level para usuários admin existentes
        await dbInstance.run(
            'UPDATE users SET admin_level = 2 WHERE email IN (?)',
        ['thiagosc31@hotmail.com']
        );
        
        res.json({
            success: true,
            message: 'Banco de dados inicializado com sucesso!\n\nTabelas criadas/verificadas:\n- users\n- sessions\n- login_logs\n- prayer_requests\n\nUsuário admin configurado com admin_level = 2'
        });
        
    } catch (error) {
        console.error('Erro ao inicializar banco de dados:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao inicializar banco de dados: ' + error.message
        });
    }
});

// Rota para upload de foto de perfil
router.post('/upload-profile-picture', authenticateToken, upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum arquivo foi enviado'
            });
        }

        const dbInstance = getDatabase();
        const userId = req.user.userId;
        const originalFilePath = req.file.path;
        const filename = req.file.filename;
        const profilePicturePath = `/uploads/profile-pictures/${filename}`;

        // Processa a imagem (redimensionamento e correção de orientação)
        try {
            const imageInfo = await sharp(originalFilePath).metadata();
            const maxWidth = 800;
            const maxHeight = 800;
            const maxFileSize = 500 * 1024; // 500KB
            const originalFormat = imageInfo.format;
            const needsResizing = imageInfo.width > maxWidth || imageInfo.height > maxHeight || req.file.size > maxFileSize;
            const needsOrientationFix = imageInfo.orientation && imageInfo.orientation !== 1;

            // Verifica se a imagem precisa ser processada (redimensionamento ou correção de orientação)
            if (needsResizing || needsOrientationFix) {
                if (needsResizing) {
                    console.log(`Redimensionando imagem ${originalFormat.toUpperCase()}: ${imageInfo.width}x${imageInfo.height} (${Math.round(req.file.size/1024)}KB)`);
                    
                    var sharpInstance = sharp(originalFilePath)
                        .rotate() // Corrige automaticamente a orientação baseada nos metadados EXIF
                        .resize({
                            width: maxWidth,
                            height: maxHeight,
                            fit: 'inside',
                            withoutEnlargement: true
                        });
                } else {
                    console.log(`Corrigindo orientação da imagem ${originalFormat.toUpperCase()}`);
                    
                    var sharpInstance = sharp(originalFilePath)
                        .rotate(); // Corrige automaticamente a orientação baseada nos metadados EXIF
                }

                // Aplica configurações específicas por formato
                switch (originalFormat) {
                    case 'jpeg':
                    case 'jpg':
                        sharpInstance = sharpInstance.jpeg({ 
                            quality: 85,
                            progressive: true
                        });
                        break;
                    case 'png':
                        sharpInstance = sharpInstance.png({ 
                            quality: 85,
                            progressive: true,
                            compressionLevel: 8
                        });
                        break;
                    case 'webp':
                        sharpInstance = sharpInstance.webp({ 
                            quality: 85,
                            effort: 4
                        });
                        break;
                    case 'gif':
                        // Para GIFs, converte para PNG para manter qualidade
                        sharpInstance = sharpInstance.png({ 
                            quality: 85,
                            progressive: true
                        });
                        break;
                    case 'bmp':
                    case 'tiff':
                        // Para BMP e TIFF, converte para JPEG para otimização
                        sharpInstance = sharpInstance.jpeg({ 
                            quality: 85,
                            progressive: true
                        });
                        break;
                    case 'svg':
                        // SVG não precisa de redimensionamento, pula o processamento
                        console.log('SVG detectado - pulando redimensionamento');
                        break;
                    default:
                        // Formato desconhecido, converte para JPEG
                        sharpInstance = sharpInstance.jpeg({ 
                            quality: 85,
                            progressive: true
                        });
                }

                // Processa a imagem (exceto SVG)
                if (originalFormat !== 'svg') {
                    await sharpInstance.toFile(originalFilePath + '_resized');
                    
                    // Substitui o arquivo original pelo redimensionado
                    fs.unlinkSync(originalFilePath);
                    fs.renameSync(originalFilePath + '_resized', originalFilePath);
                    
                    const newStats = fs.statSync(originalFilePath);
                    console.log(`Imagem ${originalFormat.toUpperCase()} processada com sucesso: ${Math.round(newStats.size/1024)}KB`);
                }
            }
        } catch (processError) {
            console.error('Erro ao processar imagem:', processError);
            // Continua com a imagem original se houver erro no processamento
        }

        // Busca a foto de perfil anterior para deletar
        const currentUser = await dbInstance.get(
            'SELECT profile_picture FROM users WHERE id = ?',
            [userId]
        );

        // Atualiza o caminho da foto de perfil no banco de dados
        await dbInstance.run(
            'UPDATE users SET profile_picture = ? WHERE id = ?',
            [profilePicturePath, userId]
        );

        // Remove a foto anterior se existir
        if (currentUser && currentUser.profile_picture) {
            const oldFilePath = path.join(__dirname, '..', currentUser.profile_picture);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        res.json({
            success: true,
            message: 'Foto de perfil atualizada com sucesso',
            data: {
                profilePicture: profilePicturePath
            }
        });

    } catch (error) {
        console.error('Erro ao fazer upload da foto de perfil:', error);
        
        // Remove o arquivo se houve erro
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao fazer upload da foto'
        });
    }
});

// Rota para deletar foto de perfil
router.delete('/profile-picture', authenticateToken, async (req, res) => {
    try {
        const dbInstance = getDatabase();
        const userId = req.user.userId;

        // Busca a foto de perfil atual
        const user = await dbInstance.get(
            'SELECT profile_picture FROM users WHERE id = ?',
            [userId]
        );

        if (!user || !user.profile_picture) {
            return res.status(404).json({
                success: false,
                message: 'Nenhuma foto de perfil encontrada'
            });
        }

        // Remove o arquivo do sistema
        const filePath = path.join(__dirname, '..', user.profile_picture);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Remove a referência do banco de dados
        await dbInstance.run(
            'UPDATE users SET profile_picture = NULL WHERE id = ?',
            [userId]
        );

        res.json({
            success: true,
            message: 'Foto de perfil removida com sucesso'
        });

    } catch (error) {
        console.error('Erro ao deletar foto de perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao deletar foto'
        });
    }
});

module.exports = router;