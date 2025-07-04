require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const winston = require('winston');
const joi = require('joi');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();
const initDatabase = require('./scripts/init-database');

// Inicializar banco de dados
const initDatabase = require('./scripts/init-database');

// Configurar Passport
require('./config/passport');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const syncRoutes = require('./routes/sync');

// Configurar Winston Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'guestfire-api' },
  transports: [
    new winston.transports.File({ 
      filename: process.env.LOG_FILE_PATH || 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: process.env.LOG_FILE_PATH || 'logs/combined.log' 
    })
  ]
});

// Em desenvolvimento, também log no console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Configurar Rate Limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // máximo 100 requests por IP
  message: {
    error: 'Muitas requisições deste IP, tente novamente em alguns minutos.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting específico para login
const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS) || 5, // máximo 5 tentativas de login
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    retryAfter: Math.ceil((parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

const app = express();
const PORT = process.env.PORT || 3000;

// Transporter SMTP com Gmail
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Middlewares
// Segurança com Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Compressão de resposta
app.use(compression());

// Rate limiting geral
app.use(generalLimiter);

// Logging de requisições HTTP
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

app.use(cors({
    origin: function (origin, callback) {
        // Permite requisições sem origem (arquivos locais), localhost e rede local
        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://192.168.1.69:3000', // IP da rede local
            null // Para arquivos locais
        ];
        
        // Permite qualquer IP da rede local 192.168.1.x e domínios do Render
        if (!origin || allowedOrigins.includes(origin) || 
            (origin && origin.match(/^http:\/\/192\.168\.1\.\d+:3000$/)) ||
            (origin && origin.match(/^https:\/\/.*\.onrender\.com$/)) ||
            origin === 'https://guestfire.onrender.com') {
            callback(null, true);
        } else {
            callback(new Error('Não permitido pelo CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar sessão
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true em produção (HTTPS)
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

// Servir arquivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Servir arquivos de upload (fotos de perfil)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  logger.error('Erro na aplicação:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Não expor detalhes do erro em produção
  const message = process.env.NODE_ENV === 'production' 
    ? 'Erro interno do servidor' 
    : err.message;
    
  res.status(err.status || 500).json({
    success: false,
    message: message
  });
});

// Middleware para requisições não encontradas
app.use((req, res, next) => {
  logger.warn('Rota não encontrada:', {
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

// Endpoint para testar envio de e-mail
app.get('/test-email', async (req, res) => {
  if (process.env.EMAIL_SIMULATION_MODE === 'true') {
    return res.send('🟡 Modo simulação ativado. Nenhum e-mail foi enviado.');
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_USER, // envia o teste para você mesmo
      subject: '✅ Teste de envio de e-mail',
      text: 'Este é um teste real usando seu servidor SMTP Gmail!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #28a745;">✅ Teste de E-mail Bem-sucedido!</h2>
          <p>Este é um teste real usando seu servidor SMTP Gmail!</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>📊 Informações do Teste:</h3>
            <ul>
              <li><strong>Servidor:</strong> ${process.env.EMAIL_HOST}</li>
              <li><strong>Porta:</strong> ${process.env.EMAIL_PORT}</li>
              <li><strong>Seguro:</strong> ${process.env.EMAIL_SECURE}</li>
              <li><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</li>
            </ul>
          </div>
          <p style="color: #6c757d; font-size: 14px;">Se você recebeu este e-mail, sua configuração SMTP está funcionando perfeitamente! 🎉</p>
        </div>
      `,
    });

    res.send(`✅ E-mail enviado com sucesso: ${info.response}`);
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err);
    res.status(500).send(`❌ Erro ao enviar e-mail: ${err.message}`);
  }
});

// Rotas da API
// Aplicar rate limiting específico para login
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sync', syncRoutes);

// ===== ROTAS PARA ANÚNCIOS E NOTIFICAÇÕES =====

// Rota para criar anúncio (apenas administradores)
app.post('/api/announcements', authenticateToken, async (req, res) => {
    try {
        console.log('📝 Dados recebidos:', req.body);
        console.log('👤 Usuário:', req.user);
        
        // Verifica se o usuário é administrador
        if (req.user.adminLevel < 1) {
            console.log('❌ Acesso negado - adminLevel:', req.user.adminLevel);
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas administradores podem criar anúncios.'
            });
        }

        const { title, content, type, priority, target_audience } = req.body;
        const adminId = req.user.userId;

        console.log('🔍 Campos extraídos:', { title, content, type, priority, target_audience });

        // Validação dos dados
        if (!title || !content || !type) {
            console.log('❌ Validação falhou - campos obrigatórios:', { title: !!title, content: !!content, type: !!type });
            return res.status(400).json({
                success: false,
                message: 'Título, conteúdo e tipo são obrigatórios'
            });
        }

        // Validar tipo
        const validTypes = ['general', 'prayer', 'event', 'maintenance'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo inválido. Use: general, prayer, event ou maintenance'
            });
        }

        // Validar prioridade
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (priority && !validPriorities.includes(priority)) {
            return res.status(400).json({
                success: false,
                message: 'Prioridade inválida. Use: low, medium, high ou urgent'
            });
        }

        // Inserir anúncio no banco de dados
        const result = await db.run(
            `INSERT INTO announcements (admin_id, title, content, type, priority, target_audience, status) 
             VALUES (?, ?, ?, ?, ?, ?, 'active')`,
            [adminId, title, content, type, priority || 'medium', target_audience || 'all']
        );

        // Criar notificações para todos os usuários (ou público-alvo específico)
        let userQuery = 'SELECT id FROM users WHERE is_active = 1';
        let userParams = [];
        
        if (target_audience && target_audience !== 'all') {
            userQuery += ' AND admin_level >= ?';
            userParams.push(target_audience === 'admins' ? 1 : 0);
        }

        const users = await db.all(userQuery, userParams);
        
        // Criar notificação para cada usuário
        for (const user of users) {
            await db.run(
                `INSERT INTO notifications (user_id, title, message, type, related_id, related_type) 
                 VALUES (?, ?, ?, 'announcement', ?, 'announcement')`,
                [user.id, title, content.substring(0, 200) + (content.length > 200 ? '...' : ''), result.id]
            );
        }

        res.json({
            success: true,
            message: 'Anúncio criado com sucesso',
            id: result.id,
            notifications_sent: users.length
        });

    } catch (error) {
        console.error('Erro ao criar anúncio:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para enviar mensagem (apenas administradores)
app.post('/api/messages', authenticateToken, async (req, res) => {
    try {
        // Verifica se o usuário é administrador
        if (req.user.adminLevel < 1) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas administradores podem enviar mensagens.'
            });
        }

        const { recipient_type, recipient_id, subject, message } = req.body;
        const adminId = req.user.userId;

        // Validação dos dados
        if (!recipient_type || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de destinatário, assunto e mensagem são obrigatórios'
            });
        }

        // Validar tipo de destinatário
        const validRecipientTypes = ['all', 'specific', 'admins'];
        if (!validRecipientTypes.includes(recipient_type)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de destinatário inválido. Use: all, specific ou admins'
            });
        }

        // Se for específico, validar se o usuário existe
        if (recipient_type === 'specific') {
            if (!recipient_id) {
                return res.status(400).json({
                    success: false,
                    message: 'ID do destinatário é obrigatório para mensagens específicas'
                });
            }

            const user = await db.get('SELECT id FROM users WHERE id = ? AND is_active = 1', [recipient_id]);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário destinatário não encontrado'
                });
            }
        }

        // Inserir mensagem no banco de dados
        const result = await db.run(
            `INSERT INTO admin_messages (admin_id, recipient_type, recipient_id, subject, message, status) 
             VALUES (?, ?, ?, ?, ?, 'sent')`,
            [adminId, recipient_type, recipient_id, subject, message]
        );

        // Determinar destinatários e criar notificações
        let userQuery = 'SELECT id FROM users WHERE is_active = 1';
        let userParams = [];
        
        if (recipient_type === 'specific') {
            userQuery += ' AND id = ?';
            userParams.push(recipient_id);
        } else if (recipient_type === 'admins') {
            userQuery += ' AND admin_level >= 1';
        }

        const users = await db.all(userQuery, userParams);
        
        // Criar notificação para cada usuário
        for (const user of users) {
            await db.run(
                `INSERT INTO notifications (user_id, title, message, type, related_id, related_type) 
                 VALUES (?, ?, ?, 'message', ?, 'admin_message')`,
                [user.id, subject, message.substring(0, 200) + (message.length > 200 ? '...' : ''), result.id]
            );
        }

        res.json({
            success: true,
            message: 'Mensagem enviada com sucesso',
            id: result.id,
            recipients: users.length
        });

    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para listar comunicações (anúncios e mensagens) - apenas administradores
app.get('/api/communications', authenticateToken, async (req, res) => {
    try {
        // Verifica se o usuário é administrador
        if (req.user.adminLevel < 1) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas administradores podem visualizar comunicações.'
            });
        }

        const { type, limit = 50, offset = 0 } = req.query;

        let communications = [];

        // Buscar anúncios
        if (!type || type === 'announcements') {
            const announcements = await db.all(
                `SELECT 
                    'announcement' as communication_type,
                    id,
                    title,
                    content as message,
                    type,
                    priority,
                    target_audience,
                    status,
                    created_at
                 FROM announcements 
                 ORDER BY created_at DESC 
                 LIMIT ? OFFSET ?`,
                [parseInt(limit), parseInt(offset)]
            );
            communications = communications.concat(announcements);
        }

        // Buscar mensagens
        if (!type || type === 'messages') {
            const messages = await db.all(
                `SELECT 
                    'message' as communication_type,
                    id,
                    subject as title,
                    message,
                    recipient_type as type,
                    'medium' as priority,
                    recipient_type as target_audience,
                    status,
                    created_at
                 FROM admin_messages 
                 ORDER BY created_at DESC 
                 LIMIT ? OFFSET ?`,
                [parseInt(limit), parseInt(offset)]
            );
            communications = communications.concat(messages);
        }

        // Ordenar por data de criação (mais recente primeiro)
        communications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json({
            success: true,
            data: communications.slice(0, parseInt(limit))
        });

    } catch (error) {
        console.error('Erro ao buscar comunicações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para editar anúncio (apenas administradores)
app.put('/api/announcements/:id', authenticateToken, async (req, res) => {
    try {
        // Verifica se o usuário é administrador
        if (req.user.adminLevel < 1) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas administradores podem editar anúncios.'
            });
        }

        const announcementId = req.params.id;
        const { title, content, type, priority, target_audience } = req.body;

        // Verificar se o anúncio existe
        const existingAnnouncement = await db.get(
            'SELECT id FROM announcements WHERE id = ?',
            [announcementId]
        );

        if (!existingAnnouncement) {
            return res.status(404).json({
                success: false,
                message: 'Anúncio não encontrado'
            });
        }

        // Validação dos dados
        if (!title || !content || !type) {
            return res.status(400).json({
                success: false,
                message: 'Título, conteúdo e tipo são obrigatórios'
            });
        }

        // Validar tipo
        const validTypes = ['general', 'prayer', 'event', 'maintenance'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo inválido. Use: general, prayer, event ou maintenance'
            });
        }

        // Validar prioridade
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (priority && !validPriorities.includes(priority)) {
            return res.status(400).json({
                success: false,
                message: 'Prioridade inválida. Use: low, medium, high ou urgent'
            });
        }

        // Atualizar anúncio no banco de dados
        await db.run(
            `UPDATE announcements 
             SET title = ?, content = ?, type = ?, priority = ?, target_audience = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [title, content, type, priority || 'medium', target_audience || 'all', announcementId]
        );

        res.json({
            success: true,
            message: 'Anúncio atualizado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao editar anúncio:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para deletar anúncio (apenas administradores)
app.delete('/api/announcements/:id', authenticateToken, async (req, res) => {
    try {
        // Verifica se o usuário é administrador
        if (req.user.adminLevel < 1) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas administradores podem deletar anúncios.'
            });
        }

        const announcementId = req.params.id;

        // Verificar se o anúncio existe
        const existingAnnouncement = await db.get(
            'SELECT id FROM announcements WHERE id = ?',
            [announcementId]
        );

        if (!existingAnnouncement) {
            return res.status(404).json({
                success: false,
                message: 'Anúncio não encontrado'
            });
        }

        // Deletar notificações relacionadas
        await db.run(
            'DELETE FROM notifications WHERE related_id = ? AND related_type = ?',
            [announcementId, 'announcement']
        );

        // Deletar anúncio
        await db.run(
            'DELETE FROM announcements WHERE id = ?',
            [announcementId]
        );

        res.json({
            success: true,
            message: 'Anúncio deletado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao deletar anúncio:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para buscar notificações do usuário
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { limit = 20, offset = 0, filter = 'all' } = req.query;

        let query = `
            SELECT 
                id,
                title,
                message,
                type,
                is_read,
                related_id,
                related_type,
                created_at
            FROM notifications 
            WHERE user_id = ?
        `;
        let params = [userId];

        // Aplicar filtro
        if (filter === 'unread') {
            query += ' AND is_read = 0';
        } else if (filter === 'read') {
            query += ' AND is_read = 1';
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const notifications = await db.all(query, params);

        // Contar notificações não lidas
        const unreadCount = await db.get(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
            [userId]
        );

        res.json({
            success: true,
            data: notifications,
            unread_count: unreadCount.count
        });

    } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para buscar anúncios públicos (usuários autenticados)
app.get('/api/announcements', authenticateToken, async (req, res) => {
    try {
        const { limit = 20, offset = 0, type } = req.query;

        let query = `
            SELECT 
                id,
                title,
                content,
                type,
                priority,
                created_at,
                (SELECT name FROM users WHERE id = admin_id) as author_name
            FROM announcements 
            WHERE status = 'active' 
            AND (target_audience = 'all' OR target_audience = 'users')
        `;
        let params = [];

        // Filtrar por tipo se especificado
        if (type && type !== 'all') {
            query += ' AND type = ?';
            params.push(type);
        }

        query += ' ORDER BY priority DESC, created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const announcements = await db.all(query, params);

        res.json({
            success: true,
            data: announcements
        });

    } catch (error) {
        console.error('Erro ao buscar anúncios:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para marcar notificação como lida
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const notificationId = req.params.id;

        // Verificar se a notificação pertence ao usuário
        const notification = await db.get(
            'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notificação não encontrada'
            });
        }

        // Marcar como lida
        await db.run(
            'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ?',
            [notificationId]
        );

        res.json({
            success: true,
            message: 'Notificação marcada como lida'
        });

    } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para marcar todas as notificações como lidas
app.put('/api/notifications/mark-all-read', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        await db.run(
            'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = 0',
            [userId]
        );

        res.json({
            success: true,
            message: 'Todas as notificações foram marcadas como lidas'
        });

    } catch (error) {
        console.error('Erro ao marcar todas as notificações como lidas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// ===== FIM DAS ROTAS PARA ANÚNCIOS E NOTIFICAÇÕES =====

// Importar e configurar banco de dados
const getDatabase = require('./config/database');
const db = getDatabase();

// Middleware para verificar autenticação JWT
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Token de acesso requerido' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido' });
        }
        
        req.user = decoded;
        next();
    });
}

// Rota para criar pedido de oração
app.post('/api/pedidos', authenticateToken, async (req, res) => {
    try {
        const { category, description } = req.body;
        const userId = req.user.userId;
        
        console.log('Token payload:', req.user);
        console.log('User ID:', userId);

        // Validação dos dados
        if (!category || !description) {
            return res.status(400).json({
                success: false,
                message: 'Categoria e descrição são obrigatórias'
            });
        }

        if (description.length > 500) {
            return res.status(400).json({
                success: false,
                message: 'Descrição deve ter no máximo 500 caracteres'
            });
        }

        // Inserir pedido no banco de dados
        const result = await db.run(
            'INSERT INTO prayer_requests (user_id, category, description, status) VALUES (?, ?, ?, ?)',
            [userId, category, description, 'ativo']
        );

        res.json({
            success: true,
            message: 'Pedido de oração criado com sucesso',
            id: result.id
        });

    } catch (error) {
        console.error('Erro ao criar pedido de oração:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para listar pedidos de oração do usuário
app.get('/api/pedidos', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const pedidos = await db.all(
            'SELECT * FROM prayer_requests WHERE user_id = ? AND status != "cancelled" ORDER BY created_at DESC',
            [userId]
        );

        res.json({
            success: true,
            pedidos: pedidos
        });

    } catch (error) {
        console.error('Erro ao buscar pedidos de oração:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para administradores visualizarem todos os pedidos
app.get('/api/pedidos/admin', authenticateToken, async (req, res) => {
    try {
        // Verifica se o usuário é administrador
        if (req.user.adminLevel < 1) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas administradores podem visualizar todos os pedidos.'
            });
        }
        
        const requests = await db.all(`
            SELECT 
                pr.*,
                u.full_name as user_name,
                u.email as user_email
            FROM prayer_requests pr
            LEFT JOIN users u ON pr.user_id = u.id
            ORDER BY pr.created_at DESC
        `);
        
        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        console.error('Erro ao buscar pedidos para admin:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para administradores alterarem status de pedidos
app.put('/api/pedidos/admin/:id/status', authenticateToken, async (req, res) => {
    try {
        // Verifica se o usuário é administrador
        if (req.user.adminLevel < 1) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas administradores podem alterar status de pedidos.'
            });
        }
        
        const { id } = req.params;
        const { status } = req.body;
        
        // Valida o status
        const validStatuses = ['pending', 'praying', 'answered'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status inválido. Use: pending, praying ou answered'
            });
        }
        
        // Verifica se o pedido existe
        const existingRequest = await db.get(
            'SELECT id FROM prayer_requests WHERE id = ?',
            [id]
        );
        
        if (!existingRequest) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }
        
        // Atualiza o status
        await db.run(
            'UPDATE prayer_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, id]
        );
        
        res.json({
            success: true,
            message: 'Status do pedido atualizado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao atualizar status do pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para administradores editarem pedidos de oração
app.put('/api/pedidos/admin/:id', authenticateToken, async (req, res) => {
    try {
        // Verifica se o usuário é administrador
        if (req.user.adminLevel < 1) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas administradores podem editar pedidos.'
            });
        }
        
        const { id } = req.params;
        const { category, description } = req.body;
        
        // Validação dos dados
        if (!category || !description) {
            return res.status(400).json({
                success: false,
                message: 'Categoria e descrição são obrigatórios'
            });
        }
        
        if (description.length > 2000) {
            return res.status(400).json({
                success: false,
                message: 'Descrição deve ter no máximo 2000 caracteres'
            });
        }
        
        // Verifica se o pedido existe
        const existingRequest = await db.get(
            'SELECT id FROM prayer_requests WHERE id = ?',
            [id]
        );
        
        if (!existingRequest) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }
        
        // Atualiza o pedido
        await db.run(
            'UPDATE prayer_requests SET category = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [category, description, id]
        );
        
        // Busca o pedido atualizado
        const updatedRequest = await db.get(
            'SELECT * FROM prayer_requests WHERE id = ?',
            [id]
        );
        
        res.json({
            success: true,
            message: 'Pedido atualizado com sucesso',
            prayer: updatedRequest
        });
    } catch (error) {
        console.error('Erro ao editar pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para administradores excluírem pedidos de oração
app.delete('/api/pedidos/admin/:id', authenticateToken, async (req, res) => {
    try {
        // Verifica se o usuário é administrador
        if (req.user.adminLevel < 1) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas administradores podem excluir pedidos.'
            });
        }
        
        const { id } = req.params;
        
        // Verifica se o pedido existe
        const existingRequest = await db.get(
            'SELECT id, user_id, status FROM prayer_requests WHERE id = ?',
            [id]
        );
        
        if (!existingRequest) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }
        
        // Marca o pedido como cancelado ao invés de deletar para manter histórico
        await db.run(
            'UPDATE prayer_requests SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
        
        res.json({
            success: true,
            message: 'Pedido cancelado com sucesso pelo administrador'
        });
    } catch (error) {
        console.error('Erro ao cancelar pedido (admin):', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para buscar pedidos de oração filtrados por status (para página de detalhes)
app.get('/api/admin/prayer-requests', authenticateToken, async (req, res) => {
    try {
        // Verifica se o usuário é administrador
        if (req.user.adminLevel < 1) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas administradores podem visualizar pedidos.'
            });
        }
        
        const { status } = req.query;
        
        // Mapear status da URL para status do banco
        const statusMap = {
            'active': 'pending',
            'praying': 'praying',
            'answered': 'answered',
            'cancelled': 'cancelled'
        };
        
        const dbStatus = statusMap[status] || 'pending';
        
        const prayers = await db.all(`
            SELECT 
                pr.id,
                pr.description,
                pr.category,
                pr.status,
                pr.created_at as createdAt,
                pr.updated_at as updatedAt,
                u.full_name as userName,
                u.email as userEmail
            FROM prayer_requests pr
            LEFT JOIN users u ON pr.user_id = u.id
            WHERE pr.status = ?
            ORDER BY pr.created_at DESC
        `, [dbStatus]);
        
        res.json({
            success: true,
            prayers: prayers,
            count: prayers.length
        });
        
    } catch (error) {
        console.error('Erro ao buscar pedidos filtrados:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            prayers: []
        });
    }
});

// ===== ROTAS DO FEED ESPIRITUAL =====

// Rota para criar um novo post no feed
app.post('/api/feed/posts', authenticateToken, async (req, res) => {
    try {
        const { type, content, is_anonymous } = req.body;
        const userId = req.user.userId;
        

        
        // Validação dos dados
        if (!type || !content) {
            return res.status(400).json({
                success: false,
                message: 'Tipo e conteúdo são obrigatórios'
            });
        }
        
        const validTypes = ['prayer', 'testimony', 'devotional'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo inválido. Use: prayer, testimony ou devotional'
            });
        }
        
        if (content.length > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Conteúdo deve ter no máximo 1000 caracteres'
            });
        }
        
        // Converter tipo para português (compatibilidade com banco de dados)
        const typeMapping = {
            'prayer': 'oracao',
            'testimony': 'testemunho',
            'devotional': 'devocional'
        };
        const dbType = typeMapping[type];
        
        // Inserir post no banco de dados
        const result = await db.run(
            'INSERT INTO feed_posts (user_id, type, content, is_anonymous) VALUES (?, ?, ?, ?)',
            [userId, dbType, content, is_anonymous ? 1 : 0]
        );
        
        // Buscar o post recém-criado com todos os dados
        const newPost = await db.get(`
            SELECT 
                fp.*,
                CASE 
                    WHEN fp.is_anonymous = 1 THEN 'Anônimo'
                    ELSE u.full_name
                END as author_name,
                CASE 
                    WHEN fp.is_anonymous = 1 THEN NULL
                    ELSE u.profile_picture
                END as author_picture
            FROM feed_posts fp
            LEFT JOIN users u ON fp.user_id = u.id
            WHERE fp.id = ?
        `, [result.id]);
        
        // Mapeamento reverso para o frontend
        const reverseTypeMapping = {
            'oracao': 'prayer',
            'testemunho': 'testimony',
            'devocional': 'devotional'
        };
        
        const postForFrontend = {
            ...newPost,
            type: reverseTypeMapping[newPost.type] || newPost.type
        };
        
        res.json(postForFrontend);
        
    } catch (error) {
        console.error('Erro ao criar post:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para listar posts do feed
app.get('/api/feed/posts', authenticateToken, async (req, res) => {
    try {
        const { type, limit = 20, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                fp.*,
                CASE 
                    WHEN fp.is_anonymous = 1 THEN 'Anônimo'
                    ELSE u.full_name
                END as author_name,
                CASE 
                    WHEN fp.is_anonymous = 1 THEN NULL
                    ELSE u.profile_picture
                END as author_picture
            FROM feed_posts fp
            LEFT JOIN users u ON fp.user_id = u.id
        `;
        
        const params = [];
        
        if (type && type !== 'todos') {
            query += ' WHERE fp.type = ?';
            params.push(type);
        }
        
        query += ' ORDER BY fp.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const posts = await db.all(query, params);
        
        // Converter tipos do banco de dados de volta para o frontend
        const reverseTypeMapping = {
            'oracao': 'prayer',
            'testemunho': 'testimony',
            'devocional': 'devotional'
        };
        
        const postsWithConvertedTypes = posts.map(post => ({
            ...post,
            type: reverseTypeMapping[post.type] || post.type
        }));
        
        res.json({
            success: true,
            posts: postsWithConvertedTypes
        });
        
    } catch (error) {
        console.error('Erro ao buscar posts:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para deletar um post
app.delete('/api/feed/posts/:id', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.userId;
        
        // Verifica se o post existe e se pertence ao usuário
        const post = await db.get('SELECT id, user_id FROM feed_posts WHERE id = ?', [postId]);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post não encontrado'
            });
        }
        
        // Verifica se o usuário é o dono do post ou é admin
        const user = await db.get('SELECT admin_level FROM users WHERE id = ?', [userId]);
        if (post.user_id !== userId && user.admin_level < 1) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para deletar este post'
            });
        }
        
        // Deleta comentários relacionados ao post
        await db.run('DELETE FROM post_comments WHERE post_id = ?', [postId]);
        
        // Deleta curtidas relacionadas ao post
        await db.run('DELETE FROM post_likes WHERE post_id = ?', [postId]);
        
        // Deleta o post
        await db.run('DELETE FROM feed_posts WHERE id = ?', [postId]);
        
        res.json({
            success: true,
            message: 'Post deletado com sucesso'
        });
        
    } catch (error) {
        console.error('Erro ao deletar post:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para curtir/descurtir um post
app.post('/api/feed/posts/:id/like', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.userId;
        
        // Verifica se o post existe
        const post = await db.get('SELECT id FROM feed_posts WHERE id = ?', [postId]);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post não encontrado'
            });
        }
        
        // Verifica se o usuário já curtiu o post
        const existingLike = await db.get(
            'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?',
            [postId, userId]
        );
        
        if (existingLike) {
            // Remove a curtida
            await db.run('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
            await db.run('UPDATE feed_posts SET likes_count = likes_count - 1 WHERE id = ?', [postId]);
            
            res.json({
                success: true,
                message: 'Curtida removida',
                liked: false
            });
        } else {
            // Adiciona a curtida
            await db.run('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
            await db.run('UPDATE feed_posts SET likes_count = likes_count + 1 WHERE id = ?', [postId]);
            
            res.json({
                success: true,
                message: 'Post curtido',
                liked: true
            });
        }
        
    } catch (error) {
        console.error('Erro ao curtir post:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para adicionar comentário a um post
app.post('/api/feed/posts/:id/comments', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.userId;
        const { content, is_anonymous } = req.body;
        
        // Validação
        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Conteúdo do comentário é obrigatório'
            });
        }
        
        if (content.length > 500) {
            return res.status(400).json({
                success: false,
                message: 'Comentário deve ter no máximo 500 caracteres'
            });
        }
        
        // Verifica se o post existe
        const post = await db.get('SELECT id FROM feed_posts WHERE id = ?', [postId]);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post não encontrado'
            });
        }
        
        // Inserir comentário
        const result = await db.run(
            'INSERT INTO post_comments (post_id, user_id, content, is_anonymous) VALUES (?, ?, ?, ?)',
            [postId, userId, content.trim(), is_anonymous || 0]
        );
        
        // Atualizar contador de comentários
        await db.run('UPDATE feed_posts SET comments_count = comments_count + 1 WHERE id = ?', [postId]);
        
        res.json({
            success: true,
            message: 'Comentário adicionado com sucesso',
            id: result.id
        });
        
    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para listar comentários de um post
app.get('/api/feed/posts/:id/comments', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        
        const comments = await db.all(`
            SELECT 
                pc.*,
                CASE 
                    WHEN pc.is_anonymous = 1 THEN 'Anônimo'
                    ELSE u.full_name
                END as author_name,
                CASE 
                    WHEN pc.is_anonymous = 1 THEN NULL
                    ELSE u.profile_picture
                END as author_picture
            FROM post_comments pc
            LEFT JOIN users u ON pc.user_id = u.id
            WHERE pc.post_id = ?
            ORDER BY pc.created_at ASC
        `, [postId]);
        
        res.json({
            success: true,
            comments: comments
        });
        
    } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para verificar se o usuário curtiu um post
app.get('/api/feed/posts/:id/like-status', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.userId;
        
        const like = await db.get(
            'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?',
            [postId, userId]
        );
        
        res.json({
            success: true,
            liked: !!like
        });
        
    } catch (error) {
        console.error('Erro ao verificar status da curtida:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para usuário editar seu próprio pedido
app.put('/api/pedidos/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { category, description } = req.body;
        const userId = req.user.userId;
        
        // Validação dos dados
        if (!category || !description) {
            return res.status(400).json({
                success: false,
                message: 'Categoria e descrição são obrigatórios'
            });
        }
        
        if (description.length > 2000) {
            return res.status(400).json({
                success: false,
                message: 'Descrição deve ter no máximo 2000 caracteres'
            });
        }
        
        // Verifica se o pedido existe e pertence ao usuário
        const existingRequest = await db.get(
            'SELECT id, user_id, status FROM prayer_requests WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        if (!existingRequest) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado ou você não tem permissão para editá-lo'
            });
        }
        
        // Verifica se o pedido ainda pode ser editado (apenas pedidos ativos)
        if (existingRequest.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Apenas pedidos ativos podem ser editados'
            });
        }
        
        // Atualiza o pedido
        await db.run(
            'UPDATE prayer_requests SET category = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
            [category, description, id, userId]
        );
        
        // Busca o pedido atualizado
        const updatedRequest = await db.get(
            'SELECT * FROM prayer_requests WHERE id = ?',
            [id]
        );
        
        res.json({
            success: true,
            message: 'Pedido atualizado com sucesso',
            prayer: updatedRequest
        });
    } catch (error) {
        console.error('Erro ao editar pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para usuário marcar seu próprio pedido como respondido
app.put('/api/pedidos/:id/answered', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        
        // Verifica se o pedido existe e pertence ao usuário
        const existingRequest = await db.get(
            'SELECT id, user_id, status FROM prayer_requests WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        if (!existingRequest) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado ou você não tem permissão para alterá-lo'
            });
        }
        
        // Verifica se o pedido já não está respondido
        if (existingRequest.status === 'answered') {
            return res.status(400).json({
                success: false,
                message: 'Este pedido já está marcado como respondido'
            });
        }
        
        // Atualiza o status para 'answered'
        await db.run(
            'UPDATE prayer_requests SET status = "answered", updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        res.json({
            success: true,
            message: 'Pedido marcado como respondido com sucesso'
        });
    } catch (error) {
        console.error('Erro ao marcar pedido como respondido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para usuário cancelar seu próprio pedido (marca como cancelado ao invés de deletar)
app.delete('/api/pedidos/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        
        // Verifica se o pedido existe e pertence ao usuário
        const existingRequest = await db.get(
            'SELECT id, user_id, status FROM prayer_requests WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        if (!existingRequest) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado ou você não tem permissão para cancelá-lo'
            });
        }
        
        // Marca o pedido como cancelado ao invés de deletar para manter histórico
        await db.run(
            'UPDATE prayer_requests SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        res.json({
            success: true,
            message: 'Pedido cancelado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao cancelar pedido:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para criar testemunho
app.post('/api/testimonies', authenticateToken, async (req, res) => {
    try {
        const { prayer_id, content, is_public, is_anonymous, show_prayer_content } = req.body;
        const userId = req.user.userId;
        
        // Validação dos dados
        if (!prayer_id || !content) {
            return res.status(400).json({
                success: false,
                message: 'ID do pedido e conteúdo são obrigatórios'
            });
        }
        
        if (content.length > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Testemunho deve ter no máximo 1000 caracteres'
            });
        }
        
        // Verifica se o pedido existe
        const prayer = await db.get(
            'SELECT id, user_id, category, description FROM prayer_requests WHERE id = ?',
            [prayer_id]
        );
        
        if (!prayer) {
            return res.status(404).json({
                success: false,
                message: 'Pedido de oração não encontrado'
            });
        }
        
        let feedPostId = null;
        
        // Se for público, criar post no feed
        if (is_public) {
            let feedContent;
            
            if (show_prayer_content) {
                // Mostrar conteúdo do pedido com o testemunho
                feedContent = `Esse é um testemunho sobre o pedido de oração: "${prayer.description.substring(0, 100)}${prayer.description.length > 100 ? '...' : ''}"\n\n${content}`;
            } else {
                // Ocultar conteúdo do pedido, mostrar apenas o testemunho
                feedContent = content;
            }
            
            const feedResult = await db.run(
                'INSERT INTO feed_posts (user_id, type, content, is_anonymous) VALUES (?, ?, ?, ?)',
                [userId, 'testemunho', feedContent, is_anonymous ? 1 : 0]
            );
            
            feedPostId = feedResult.id;
        }
        
        // Inserir testemunho na tabela específica
        const result = await db.run(
            'INSERT INTO testimonies (prayer_id, user_id, content, is_public, is_anonymous, feed_post_id, show_prayer_content) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [prayer_id, userId, content, is_public ? 1 : 0, is_anonymous ? 1 : 0, feedPostId, show_prayer_content ? 1 : 0]
        );
        
        res.json({
            success: true,
            message: 'Testemunho criado com sucesso',
            testimony_id: result.id,
            feed_post_id: feedPostId
        });
        
    } catch (error) {
        console.error('Erro ao criar testemunho:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para listar testemunhos de um pedido
app.get('/api/testimonies/prayer/:prayer_id', authenticateToken, async (req, res) => {
    try {
        const { prayer_id } = req.params;
        const userId = req.user.userId;
        
        // Verifica se o pedido existe
        const prayer = await db.get(
            'SELECT id, user_id FROM prayer_requests WHERE id = ?',
            [prayer_id]
        );
        
        if (!prayer) {
            return res.status(404).json({
                success: false,
                message: 'Pedido de oração não encontrado'
            });
        }
        
        // Buscar testemunhos (públicos para todos, privados apenas para o autor do pedido)
        const testimonies = await db.all(`
            SELECT 
                t.*,
                CASE 
                    WHEN t.is_anonymous = 1 THEN 'Anônimo'
                    ELSE u.full_name
                END as author_name,
                CASE 
                    WHEN t.is_anonymous = 1 THEN NULL
                    ELSE u.profile_picture
                END as author_picture
            FROM testimonies t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.prayer_id = ? AND (
                t.is_public = 1 OR 
                t.user_id = ? OR 
                ? = ?
            )
            ORDER BY t.created_at DESC
        `, [prayer_id, userId, userId, prayer.user_id]);
        
        res.json({
            success: true,
            testimonies: testimonies
        });
        
    } catch (error) {
        console.error('Erro ao buscar testemunhos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rotas de autenticação social
// Google
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => {
    // Sucesso na autenticação
    res.redirect('/dashboard.html');
  }
);

// Facebook
app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login.html' }),
  (req, res) => {
    res.redirect('/dashboard.html');
  }
);

// GitHub
app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login.html' }),
  (req, res) => {
    res.redirect('/dashboard.html');
  }
);

// Apple
app.get('/auth/apple',
  passport.authenticate('apple')
);

app.get('/auth/apple/callback',
  passport.authenticate('apple', { failureRedirect: '/login.html' }),
  (req, res) => {
    res.redirect('/dashboard.html');
  }
);

// Rota para logout
app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao fazer logout' });
    }
    res.redirect('/login.html');
  });
});

// Rota para servir o index.html na raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para servir páginas específicas
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'forgot-password.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro no servidor:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Rota não encontrada'
    });
});

// Função para iniciar o servidor
async function startServer() {
    try {
        // Inicializar banco de dados
        await initDatabase();
        console.log('✅ Banco de dados inicializado com sucesso!');
        
        // Inicia o servidor
        app.listen(PORT, '0.0.0.0', () => {
            console.log('🚀 Servidor iniciado com sucesso!');
            console.log(`📡 Acesso Local: http://localhost:${PORT}`);
            console.log(`🌐 Acesso Rede: http://192.168.1.69:${PORT}`);
            console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log('\n📋 Rotas disponíveis:');
            console.log('   GET  /                    - Página de login');
            console.log('   GET  /register            - Página de cadastro');
            console.log('   GET  /dashboard           - Dashboard');
            console.log('   POST /api/auth/register   - Cadastrar usuário');
            console.log('   POST /api/auth/login      - Fazer login');
            console.log('   POST /api/auth/logout     - Fazer logout');
            console.log('   GET  /api/users/profile   - Perfil do usuário');
            console.log('   GET  /test-email          - Testar envio de e-mail');
            console.log('\n🔥 Servidor acessível pela rede local!');
        });
    } catch (error) {
        console.error('❌ Erro ao inicializar servidor:', error);
        process.exit(1);
    }
}

// Iniciar servidor
startServer();

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
    console.error('❌ Erro não capturado:', err);
    console.error('Stack trace:', err.stack);
    // Não encerra o processo, apenas loga o erro
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada não tratada:', reason);
    console.error('Promise:', promise);
    // Não encerra o processo, apenas loga o erro
});

// Tratamento de sinais para encerramento gracioso
process.on('SIGINT', () => {
    console.log('\n🛑 Encerrando servidor...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Encerrando servidor...');
    process.exit(0);
});

console.log('🛡️ Tratamento de erros não capturados ativado');