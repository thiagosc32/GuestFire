const joi = require('joi');
const winston = require('winston');

// Configurar logger para validação
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'validation-middleware' },
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

// Esquemas de validação
const schemas = {
  // Validação para registro de usuário
  register: joi.object({
    name: joi.string().min(2).max(50).required().messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 50 caracteres',
      'any.required': 'Nome é obrigatório'
    }),
    email: joi.string().email().required().messages({
      'string.email': 'Email deve ter um formato válido',
      'any.required': 'Email é obrigatório'
    }),
    password: joi.string().min(6).max(100).required().messages({
      'string.min': 'Senha deve ter pelo menos 6 caracteres',
      'string.max': 'Senha deve ter no máximo 100 caracteres',
      'any.required': 'Senha é obrigatória'
    })
  }),

  // Validação para login
  login: joi.object({
    email: joi.string().email().required().messages({
      'string.email': 'Email deve ter um formato válido',
      'any.required': 'Email é obrigatório'
    }),
    password: joi.string().required().messages({
      'any.required': 'Senha é obrigatória'
    })
  }),

  // Validação para pedidos de oração
  prayer: joi.object({
    title: joi.string().min(3).max(100).required().messages({
      'string.min': 'Título deve ter pelo menos 3 caracteres',
      'string.max': 'Título deve ter no máximo 100 caracteres',
      'any.required': 'Título é obrigatório'
    }),
    content: joi.string().min(10).max(1000).required().messages({
      'string.min': 'Conteúdo deve ter pelo menos 10 caracteres',
      'string.max': 'Conteúdo deve ter no máximo 1000 caracteres',
      'any.required': 'Conteúdo é obrigatório'
    }),
    isAnonymous: joi.boolean().default(false),
    category: joi.string().valid('saude', 'familia', 'trabalho', 'estudos', 'relacionamentos', 'outros').default('outros')
  }),

  // Validação para anúncios
  announcement: joi.object({
    title: joi.string().min(3).max(100).required().messages({
      'string.min': 'Título deve ter pelo menos 3 caracteres',
      'string.max': 'Título deve ter no máximo 100 caracteres',
      'any.required': 'Título é obrigatório'
    }),
    content: joi.string().min(10).max(2000).required().messages({
      'string.min': 'Conteúdo deve ter pelo menos 10 caracteres',
      'string.max': 'Conteúdo deve ter no máximo 2000 caracteres',
      'any.required': 'Conteúdo é obrigatório'
    }),
    type: joi.string().valid('info', 'warning', 'success', 'error').default('info'),
    priority: joi.number().integer().min(1).max(5).default(3),
    target_audience: joi.string().valid('all', 'members', 'admins').default('all')
  }),

  // Validação para atualização de perfil
  updateProfile: joi.object({
    name: joi.string().min(2).max(50).optional().messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 50 caracteres'
    }),
    bio: joi.string().max(500).optional().allow('').messages({
      'string.max': 'Bio deve ter no máximo 500 caracteres'
    }),
    phone: joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().allow('').messages({
      'string.pattern.base': 'Telefone deve ter um formato válido'
    })
  })
};

// Middleware de validação
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Erro de validação:', {
        url: req.url,
        method: req.method,
        ip: req.ip,
        errors: errors,
        body: req.body
      });

      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors
      });
    }

    // Substituir req.body pelos dados validados e sanitizados
    req.body = value;
    next();
  };
};

// Middleware para sanitizar entrada
const sanitizeInput = (req, res, next) => {
  // Função para sanitizar strings
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    // Remover caracteres perigosos
    return str
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove scripts
      .replace(/<[^>]*>/g, '') // Remove tags HTML
      .replace(/javascript:/gi, '') // Remove javascript:
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  };

  // Função recursiva para sanitizar objetos
  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  };

  // Sanitizar body, query e params
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

module.exports = {
  validate,
  schemas,
  sanitizeInput
};