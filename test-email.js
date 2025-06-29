const nodemailer = require('nodemailer');

// Teste de conectividade SMTP do Gmail
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'tsales19@gmail.com',
    pass: 'mxttpevddtqvqser', // senha de app
  },
});

console.log('🔍 Testando conectividade SMTP do Gmail...');
console.log('📧 Email:', 'tsales19@gmail.com');
console.log('🔐 Senha de app:', 'mxtt***qser (oculta)');
console.log('🌐 Host:', 'smtp.gmail.com');
console.log('🔌 Porta:', '465 (SSL)');
console.log('\n' + '='.repeat(50));

// Verificar conectividade
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ ERRO DE VERIFICAÇÃO:');
    console.error('   Código:', error.code);
    console.error('   Resposta:', error.response);
    console.error('   Comando:', error.command);
    console.error('\n💡 POSSÍVEIS SOLUÇÕES:');
    console.error('   1. Verificar se a senha de app está correta');
    console.error('   2. Confirmar que 2FA está ativado no Gmail');
    console.error('   3. Gerar nova senha de app');
    console.error('   4. Verificar configurações de segurança da conta');
  } else {
    console.log('✅ SUCESSO!');
    console.log('   Servidor está pronto para enviar e-mails');
    console.log('   Conectividade SMTP confirmada');
    
    // Teste de envio opcional
    console.log('\n🧪 Deseja testar envio real? (descomente o código abaixo)');
    /*
    const mailOptions = {
      from: 'tsales19@gmail.com',
      to: 'tsales19@gmail.com', // enviar para si mesmo
      subject: 'Teste de Conectividade SMTP',
      text: 'Este é um teste de envio de e-mail via Gmail SMTP.\n\nSe você recebeu este e-mail, a configuração está funcionando corretamente!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">✅ Teste de Conectividade SMTP</h2>
          <p>Este é um teste de envio de e-mail via Gmail SMTP.</p>
          <p><strong>Se você recebeu este e-mail, a configuração está funcionando corretamente!</strong></p>
          <hr>
          <p style="color: #666; font-size: 12px;">Teste realizado em: ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      `
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ Erro no envio:', error);
      } else {
        console.log('✅ E-mail enviado:', info.messageId);
        console.log('📬 Verifique sua caixa de entrada!');
      }
    });
    */
  }
});

console.log('\n⏳ Aguardando resultado da verificação...');