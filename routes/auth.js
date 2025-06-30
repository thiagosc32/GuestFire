const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const getDatabase = require('../config/database');
const { generateVerificationCode, sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');
const router = express.Router();

// Handle preflight OPTIONS requests for CORS
router.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
});

// Middleware de validação para registro
const validateRegister = [
    body('fullName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nome deve ter entre 2 e 100 caracteres')
        .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
        .withMessage('Nome deve conter apenas letras e espaços'),
    
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email deve ser válido'),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Senha deve ter pelo menos 6 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Confirmação de senha não confere');
            }
            return true;
        })
];

// Middleware de validação para login
const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email deve ser válido'),
    
    body('password')
        .notEmpty()
        .withMessage('Senha é obrigatória')
];

// Função para registrar log de login
async function logLoginAttempt(email, userId, success, req) {
    const db = getDatabase();
    try {
        await db.run(
            'INSERT INTO login_logs (user_id, email, success, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
            [userId, email, success, req.ip, req.get('User-Agent')]
        );
    } catch (error) {
        console.error('Erro ao registrar log de login:', error);
    }
}

// Rota para iniciar o registro (envia código de verificação)
router.post('/register', validateRegister, async (req, res) => {
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

        const { fullName, email, password } = req.body;
        const db = getDatabase();

        // Verifica se o email já existe
        const existingUser = await db.get(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email já está em uso'
            });
        }

        // Gera código de verificação
        const verificationCode = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        // Hash da senha para armazenar temporariamente
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Armazena dados temporários para verificação
        const userData = JSON.stringify({
            fullName,
            email,
            passwordHash
        });

        // Remove códigos antigos para este email
        await db.run(
            'DELETE FROM email_verifications WHERE email = ?',
            [email]
        );

        // Insere novo código de verificação
        await db.run(
            'INSERT INTO email_verifications (email, verification_code, expires_at, user_data) VALUES (?, ?, ?, ?)',
            [email, verificationCode, expiresAt.toISOString(), userData]
        );

        // Envia email de verificação
        const emailResult = await sendVerificationEmail(email, verificationCode, fullName);

        if (!emailResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao enviar email de verificação'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Código de verificação enviado para seu email',
            data: {
                email: email,
                expiresIn: 15 // minutos
            }
        });

    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para verificar código e completar o registro
router.post('/verify-email', [
    body('email').isEmail().normalizeEmail().withMessage('Email deve ser válido'),
    body('verificationCode').isLength({ min: 6, max: 6 }).withMessage('Código deve ter 6 dígitos')
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

        const { email, verificationCode } = req.body;
        const db = getDatabase();

        // Busca código de verificação
        const verification = await db.get(
            'SELECT * FROM email_verifications WHERE email = ? AND verification_code = ? AND is_used = 0',
            [email, verificationCode]
        );

        if (!verification) {
            return res.status(400).json({
                success: false,
                message: 'Código de verificação inválido ou já utilizado'
            });
        }

        // Verifica se o código não expirou
        const now = new Date();
        const expiresAt = new Date(verification.expires_at);
        
        if (now > expiresAt) {
            return res.status(400).json({
                success: false,
                message: 'Código de verificação expirado'
            });
        }

        // Recupera dados do usuário
        const userData = JSON.parse(verification.user_data);

        // Verifica novamente se o email não foi registrado enquanto isso
        const existingUser = await db.get(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email já está em uso'
            });
        }

        // Cria o usuário
        const result = await db.run(
            'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
            [userData.fullName, userData.email, userData.passwordHash]
        );

        // Marca código como usado
        await db.run(
            'UPDATE email_verifications SET is_used = 1 WHERE id = ?',
            [verification.id]
        );

        // Gera token JWT
        const token = jwt.sign(
            { 
                userId: result.id, 
                email: userData.email,
                fullName: userData.fullName,
                adminLevel: 0
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'Usuário cadastrado com sucesso',
            data: {
                user: {
                    id: result.id,
                    fullName: userData.fullName,
                    email: userData.email
                },
                token: token
            }
        });

    } catch (error) {
        console.error('Erro na verificação:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota de login
router.post('/login', validateLogin, async (req, res) => {
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

        const { email, password, rememberMe } = req.body;
        const db = getDatabase();

        // Busca o usuário pelo email
        const user = await db.get(
            'SELECT id, full_name, email, password_hash, is_active, admin_level FROM users WHERE email = ?',
            [email]
        );

        if (!user) {
            await logLoginAttempt(email, null, false, req);
            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }

        // Verifica se o usuário está ativo
        if (!user.is_active) {
            await logLoginAttempt(email, user.id, false, req);
            return res.status(401).json({
                success: false,
                message: 'Conta desativada'
            });
        }

        // Verifica a senha
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            await logLoginAttempt(email, user.id, false, req);
            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }

        // Gera token JWT
        const expiresIn = rememberMe ? '30d' : (process.env.JWT_EXPIRES_IN || '24h');
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email,
                fullName: user.full_name,
                adminLevel: user.admin_level || 0
            },
            process.env.JWT_SECRET,
            { expiresIn: expiresIn }
        );

        // Registra log de login bem-sucedido
        await logLoginAttempt(email, user.id, true, req);

        res.json({
            success: true,
            message: 'Login realizado com sucesso',
            data: {
                user: {
                    id: user.id,
                    fullName: user.full_name,
                    email: user.email
                },
                token: token,
                rememberMe: rememberMe || false
            }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota de logout (opcional, para invalidar token no frontend)
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logout realizado com sucesso'
    });
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

// Rota para verificar se o token é válido
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Token válido',
        data: {
            user: {
                id: req.user.userId,
                fullName: req.user.fullName,
                email: req.user.email,
                adminLevel: req.user.adminLevel || 0
            }
        }
    });
});

// Middleware de validação para recuperação de senha
const validatePasswordReset = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email deve ser válido')
];

// Middleware de validação para confirmação de reset
const validatePasswordResetConfirm = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email deve ser válido'),
    
    body('code')
        .isLength({ min: 6, max: 6 })
        .withMessage('Código deve ter 6 dígitos'),
    
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('Nova senha deve ter pelo menos 6 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Nova senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número')
];

// Rota para solicitar recuperação de senha
router.post('/forgot-password', validatePasswordReset, async (req, res) => {
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

        const { email } = req.body;
        const db = getDatabase();

        // Verifica se o usuário existe
        const user = await db.get(
            'SELECT id, full_name FROM users WHERE email = ? AND is_active = 1',
            [email]
        );

        // Sempre retorna sucesso por segurança (não revela se email existe)
        if (!user) {
            return res.json({
                success: true,
                message: 'Se o email existir em nossa base, você receberá um código de recuperação'
            });
        }

        // Gera código de verificação
        const resetCode = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        // Remove códigos antigos para este email
        await db.run(
            'DELETE FROM password_resets WHERE email = ?',
            [email]
        );

        // Salva o código de reset
        await db.run(
            'INSERT INTO password_resets (email, reset_code, expires_at) VALUES (?, ?, ?)',
            [email, resetCode, expiresAt.toISOString()]
        );

        // Envia email com código
        const emailResult = await sendPasswordResetEmail(email, resetCode, user.full_name);
        
        if (!emailResult.success) {
            console.error('Erro ao enviar email de recuperação:', emailResult.error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }

        res.json({
            success: true,
            message: 'Se o email existir em nossa base, você receberá um código de recuperação'
        });

    } catch (error) {
        console.error('Erro na recuperação de senha:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para confirmar reset de senha
router.post('/reset-password', validatePasswordResetConfirm, async (req, res) => {
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

        const { email, code, newPassword } = req.body;
        const db = getDatabase();

        // Verifica o código de reset
        const resetRecord = await db.get(
            'SELECT * FROM password_resets WHERE email = ? AND reset_code = ? AND expires_at > datetime("now")',
            [email, code]
        );

        if (!resetRecord) {
            return res.status(400).json({
                success: false,
                message: 'Código inválido ou expirado'
            });
        }

        // Verifica se o usuário existe
        const user = await db.get(
            'SELECT id FROM users WHERE email = ? AND is_active = 1',
            [email]
        );

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Hash da nova senha
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Atualiza a senha
        await db.run(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
            [newPasswordHash, email]
        );

        // Remove o código de reset usado
        await db.run(
            'DELETE FROM password_resets WHERE email = ?',
            [email]
        );

        res.json({
            success: true,
            message: 'Senha alterada com sucesso'
        });

    } catch (error) {
        console.error('Erro ao resetar senha:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

module.exports = router;