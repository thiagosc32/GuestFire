const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Configuração do transporter de email
let transporter;

// Função para inicializar o transporter
function initializeEmailService() {
    // Modo de simulação para desenvolvimento
    if (process.env.EMAIL_SIMULATION_MODE === 'true') {
        // Criar um transporter fake que simula o envio
        transporter = {
            sendMail: async (mailOptions) => {
                console.log('📧 [SIMULAÇÃO] Email que seria enviado:');
                console.log('   Para:', mailOptions.to);
                console.log('   Assunto:', mailOptions.subject);
                console.log('   Conteúdo:', mailOptions.text || mailOptions.html);
                return {
                    messageId: 'simulated-' + Date.now(),
                    response: 'Email simulado com sucesso'
                };
            }
        };
        console.log('📧 Serviço de email configurado em MODO SIMULAÇÃO');
    } else if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_HOST) {
        // Para desenvolvimento, você pode usar um serviço de teste como Ethereal
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            auth: {
                user: 'ethereal.user@ethereal.email',
                pass: 'ethereal.pass'
            }
        });
        console.log('📧 Serviço de email configurado para desenvolvimento (Ethereal)');
    } else {
        // Configuração para produção
        transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        console.log('📧 Serviço de email configurado para produção');
    }
}

// Função para gerar código de verificação
function generateVerificationCode() {
    return crypto.randomInt(100000, 999999).toString();
}

// Adicionar estas melhorias ao emailService.js

// Função melhorada para enviar email de verificação
async function sendVerificationEmail(email, verificationCode, userName) {
    if (!transporter) {
        initializeEmailService();
    }

    const mailOptions = {
        from: {
            name: 'Sistema de Autenticação',
            address: process.env.EMAIL_FROM || 'noreply@sistema.com'
        },
        to: email,
        subject: '🔐 Código de Verificação - Confirme seu Email',
        text: `Olá ${userName},\n\nSeu código de verificação é: ${verificationCode}\n\nEste código expira em 15 minutos.\n\nSe você não solicitou este cadastro, ignore este email.`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verificação de Email</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 40px 0; text-align: center;">
                            <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                                <!-- Header -->
                                <tr>
                                    <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 3px solid #007bff;">
                                        <h1 style="margin: 0; color: #333; font-size: 24px;">🔐 Verificação de Email</h1>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 40px;">
                                        <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.5;">Olá <strong>${userName}</strong>,</p>
                                        
                                        <p style="margin: 0 0 30px; color: #666; font-size: 14px; line-height: 1.5;">Para completar seu cadastro em nosso sistema, confirme seu email usando o código abaixo:</p>
                                        
                                        <!-- Verification Code -->
                                        <table role="presentation" style="width: 100%; margin: 30px 0;">
                                            <tr>
                                                <td style="text-align: center;">
                                                    <div style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; display: inline-block; box-shadow: 0 4px 15px rgba(0,123,255,0.3);">
                                                        ${verificationCode}
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                            <p style="margin: 0; color: #856404; font-size: 14px;"><strong>⏰ Importante:</strong> Este código expira em 15 minutos por segurança.</p>
                                        </div>
                                        
                                        <p style="margin: 20px 0 0; color: #666; font-size: 13px; line-height: 1.4;">Se você não solicitou este cadastro, pode ignorar este email com segurança.</p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="padding: 20px 40px; background-color: #f8f9fa; border-top: 1px solid #dee2e6; text-align: center; border-radius: 0 0 8px 8px;">
                                        <p style="margin: 0; color: #6c757d; font-size: 12px;">Este é um email automático do sistema de autenticação.</p>
                                        <p style="margin: 5px 0 0; color: #6c757d; font-size: 12px;">© ${new Date().getFullYear()} Sistema de Login - Todos os direitos reservados</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
        headers: {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            'Importance': 'high',
            'List-Unsubscribe': '<mailto:unsubscribe@seudominio.com>',
            'X-Mailer': 'Sistema de Autenticação v1.0'
        }
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email de verificação enviado:', info.messageId);
        
        // Para desenvolvimento, mostra o link de preview
        if (process.env.NODE_ENV === 'development') {
            console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
        }
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error);
        return { success: false, error: error.message };
    }
}

// Função para verificar se o serviço de email está funcionando
async function testEmailService() {
    if (!transporter) {
        initializeEmailService();
    }

    try {
        await transporter.verify();
        console.log('✅ Serviço de email está funcionando');
        return true;
    } catch (error) {
        console.error('❌ Erro no serviço de email:', error);
        return false;
    }
}

// Função para enviar email de recuperação de senha
async function sendPasswordResetEmail(email, resetCode, userName) {
    if (!transporter) {
        initializeEmailService();
    }

    const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@sistema.com',
        to: email,
        subject: 'Recuperação de Senha - Sistema de Login',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Recuperação de Senha</h2>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p>Olá <strong>${userName}</strong>,</p>
                    
                    <p>Você solicitou a recuperação de sua senha. Utilize o código abaixo para criar uma nova senha:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="background-color: #dc3545; color: white; padding: 15px 30px; border-radius: 5px; font-size: 24px; font-weight: bold; letter-spacing: 3px; display: inline-block;">
                            ${resetCode}
                        </div>
                    </div>
                    
                    <p><strong>Este código expira em 15 minutos.</strong></p>
                    
                    <p>Se você não solicitou esta recuperação, pode ignorar este email com segurança.</p>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0; color: #856404;"><strong>⚠️ Dica de Segurança:</strong> Nunca compartilhe este código com outras pessoas. Nossa equipe nunca solicitará este código por telefone ou email.</p>
                    </div>
                </div>
                
                <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
                    <p>Este é um email automático, não responda.</p>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email de recuperação de senha enviado:', info.messageId);
        
        // Para desenvolvimento, mostra o link de preview
        if (process.env.NODE_ENV === 'development') {
            console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
        }
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Erro ao enviar email de recuperação:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    initializeEmailService,
    generateVerificationCode,
    sendVerificationEmail,
    sendPasswordResetEmail,
    testEmailService
};