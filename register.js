// Configuração da API
// Detecta automaticamente a URL base para funcionar tanto no localhost quanto na rede
// Detecta se estamos usando localtunnel ou localhost
const isLocaltunnel = window.location.hostname.includes('.loca.lt');
const API_BASE_URL = isLocaltunnel 
    ? `${window.location.protocol}//${window.location.hostname}/api`
    : `${window.location.protocol}//${window.location.hostname}:${window.location.port || '3000'}/api`;

// Variáveis globais
let currentEmail = '';
let timerInterval = null;

// Aguarda o carregamento completo da página
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const verificationForm = document.getElementById('verificationForm');
    const messageDiv = document.getElementById('message');
    const registerSection = document.getElementById('registerSection');
    const verificationSection = document.getElementById('verificationSection');
    const verificationEmailSpan = document.getElementById('verificationEmail');
    const resendCodeLink = document.getElementById('resendCode');
    const backToRegisterLink = document.getElementById('backToRegister');
    const timerSpan = document.getElementById('timer');
    
    // Função para mostrar mensagens
    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        // Remove a mensagem após 5 segundos
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
    
    // Função para validar email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Função para verificar força da senha
    function checkPasswordStrength(password) {
        const minLength = password.length >= 6;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        
        const score = [minLength, hasUpperCase, hasLowerCase, hasNumbers].filter(Boolean).length;
        
        if (score < 3) return { strength: 'fraca', valid: false };
        if (score < 4) return { strength: 'média', valid: true };
        return { strength: 'forte', valid: true };
    }
    
    // Função para validar formulário
    function validateForm(formData) {
        const { fullName, email, password, confirmPassword, terms } = formData;
        
        // Validação do nome
        if (!fullName || fullName.trim().length < 2) {
            showMessage('Nome deve ter pelo menos 2 caracteres.', 'error');
            return false;
        }
        
        if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(fullName.trim())) {
            showMessage('Nome deve conter apenas letras e espaços.', 'error');
            return false;
        }
        
        // Validação do email
        if (!email || !isValidEmail(email)) {
            showMessage('Por favor, insira um email válido.', 'error');
            return false;
        }
        
        // Validação da senha
        const passwordCheck = checkPasswordStrength(password);
        if (!passwordCheck.valid) {
            showMessage('Senha deve ter pelo menos 6 caracteres com letras maiúsculas, minúsculas e números.', 'error');
            return false;
        }
        
        // Confirmação da senha
        if (password !== confirmPassword) {
            showMessage('As senhas não coincidem.', 'error');
            return false;
        }
        
        // Termos de uso
        if (!terms) {
            showMessage('Você deve aceitar os termos de uso.', 'error');
            return false;
        }
        
        return true;
    }
    
    // Função para iniciar timer de expiração
    function startTimer(minutes = 15) {
        let timeLeft = minutes * 60; // em segundos
        
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        timerInterval = setInterval(() => {
            const mins = Math.floor(timeLeft / 60);
            const secs = timeLeft % 60;
            timerSpan.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                showMessage('Código de verificação expirado. Solicite um novo código.', 'error');
            }
            
            timeLeft--;
        }, 1000);
    }
    
    // Função para mostrar seção de verificação
    function showVerificationSection(email) {
        currentEmail = email;
        verificationEmailSpan.textContent = email;
        registerSection.style.display = 'none';
        verificationSection.style.display = 'block';
        startTimer(15);
        
        // Foca no campo de código
        document.getElementById('verificationCode').focus();
    }
    
    // Função para voltar ao registro
    function showRegisterSection() {
        registerSection.style.display = 'block';
        verificationSection.style.display = 'none';
        
        if (timerInterval) {
            clearInterval(timerInterval);
        }
    }
    
    // Função para registrar usuário via API (envia código)
    async function registerUser(userData) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fullName: userData.fullName.trim(),
                    email: userData.email.toLowerCase(),
                    password: userData.password,
                    confirmPassword: userData.confirmPassword
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                return { success: true, email: data.data.email, message: data.message };
            } else {
                return { success: false, message: data.message, errors: data.errors };
            }
        } catch (error) {
            console.error('Erro no registro:', error);
            return { success: false, message: 'Erro de conexão com o servidor. Tente novamente.' };
        }
    }
    
    // Função para verificar código de verificação
    async function verifyEmailCode(email, verificationCode) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    verificationCode: verificationCode
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Salva o token e informações do usuário
                const sessionData = {
                    token: data.data.token,
                    user: data.data.user,
                    loginTime: new Date().toISOString(),
                    rememberMe: false
                };
                
                sessionStorage.setItem('userSession', JSON.stringify(sessionData));
                
                return { success: true, user: data.data.user, message: data.message };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Erro na verificação:', error);
            return { success: false, message: 'Erro de conexão com o servidor. Tente novamente.' };
        }
    }
    
    // Event listener para o formulário de registro
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            fullName: document.getElementById('fullName').value,
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            confirmPassword: document.getElementById('confirmPassword').value,
            terms: document.getElementById('terms').checked
        };
        
        // Valida o formulário
        if (!validateForm(formData)) {
            return;
        }
        
        // Simula delay de processamento
        const submitBtn = registerForm.querySelector('.login-btn');
        const originalText = submitBtn.textContent;
        
        submitBtn.textContent = 'Enviando código...';
        submitBtn.disabled = true;
        
        try {
            const result = await registerUser(formData);
            
            if (result.success) {
                showMessage(result.message, 'success');
                showVerificationSection(result.email);
            } else {
                // Mostra erros específicos se disponíveis
                if (result.errors && result.errors.length > 0) {
                    const errorMessages = result.errors.map(err => err.msg).join(', ');
                    showMessage(errorMessages, 'error');
                } else {
                    showMessage(result.message, 'error');
                }
            }
        } catch (error) {
            showMessage('Erro ao enviar código. Tente novamente.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
    
    // Event listener para o formulário de verificação
    verificationForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const verificationCode = document.getElementById('verificationCode').value.trim();
        
        if (!verificationCode || verificationCode.length !== 6) {
            showMessage('Por favor, digite um código de 6 dígitos.', 'error');
            return;
        }
        
        const submitBtn = verificationForm.querySelector('.login-btn');
        const originalText = submitBtn.textContent;
        
        submitBtn.textContent = 'Verificando...';
        submitBtn.disabled = true;
        
        try {
            const result = await verifyEmailCode(currentEmail, verificationCode);
            
            if (result.success) {
                showMessage(`Conta criada com sucesso! Bem-vindo, ${result.user.fullName}!`, 'success');
                
                // Redireciona para o dashboard após 2 segundos
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            } else {
                showMessage(result.message, 'error');
            }
        } catch (error) {
            showMessage('Erro ao verificar código. Tente novamente.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
    
    // Event listener para reenviar código
    resendCodeLink.addEventListener('click', async function(e) {
        e.preventDefault();
        
        if (!currentEmail) {
            showMessage('Erro: email não encontrado.', 'error');
            return;
        }
        
        // Simula reenvio (na verdade, faz um novo registro)
        const formData = {
            fullName: document.getElementById('fullName').value,
            email: currentEmail,
            password: document.getElementById('password').value,
            confirmPassword: document.getElementById('confirmPassword').value,
            terms: true
        };
        
        try {
            const result = await registerUser(formData);
            
            if (result.success) {
                showMessage('Novo código enviado!', 'success');
                startTimer(15); // Reinicia o timer
            } else {
                showMessage('Erro ao reenviar código.', 'error');
            }
        } catch (error) {
            showMessage('Erro ao reenviar código.', 'error');
        }
    });
    
    // Event listener para voltar ao registro
    backToRegisterLink.addEventListener('click', function(e) {
        e.preventDefault();
        showRegisterSection();
        document.getElementById('verificationCode').value = '';
    });
    
    // Validação em tempo real da senha
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        if (password.length > 0) {
            const validation = checkPasswordStrength(password);
            
            // Adiciona indicador visual da força da senha
            let strengthIndicator = document.getElementById('passwordStrength');
            if (!strengthIndicator) {
                strengthIndicator = document.createElement('div');
                strengthIndicator.id = 'passwordStrength';
                strengthIndicator.style.marginTop = '5px';
                strengthIndicator.style.fontSize = '12px';
                this.parentElement.appendChild(strengthIndicator);
            }
            
            if (validation.valid) {
                strengthIndicator.textContent = `Força da senha: ${validation.strength}`;
                strengthIndicator.style.color = validation.strength === 'forte' ? '#28a745' : '#ffc107';
            } else {
                strengthIndicator.textContent = 'Senha muito fraca';
                strengthIndicator.style.color = '#dc3545';
            }
        }
    });
    
    confirmPasswordInput.addEventListener('input', function() {
        const password = passwordInput.value;
        const confirmPassword = this.value;
        
        if (confirmPassword.length > 0) {
            let matchIndicator = document.getElementById('passwordMatch');
            if (!matchIndicator) {
                matchIndicator = document.createElement('div');
                matchIndicator.id = 'passwordMatch';
                matchIndicator.style.marginTop = '5px';
                matchIndicator.style.fontSize = '12px';
                this.parentElement.appendChild(matchIndicator);
            }
            
            if (password === confirmPassword) {
                matchIndicator.textContent = 'Senhas coincidem ✓';
                matchIndicator.style.color = '#28a745';
            } else {
                matchIndicator.textContent = 'Senhas não coincidem ✗';
                matchIndicator.style.color = '#dc3545';
            }
        }
    });
    
    // Formatação do campo de código de verificação
    const verificationCodeInput = document.getElementById('verificationCode');
    if (verificationCodeInput) {
        verificationCodeInput.addEventListener('input', function() {
            // Remove caracteres não numéricos
            this.value = this.value.replace(/\D/g, '');
            
            // Limita a 6 dígitos
            if (this.value.length > 6) {
                this.value = this.value.slice(0, 6);
            }
        });
        
        // Auto-submit quando 6 dígitos são inseridos
        verificationCodeInput.addEventListener('input', function() {
            if (this.value.length === 6) {
                // Pequeno delay para melhor UX
                setTimeout(() => {
                    verificationForm.dispatchEvent(new Event('submit'));
                }, 500);
            }
        });
    }
    
    // Adiciona efeitos visuais aos campos de input
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.classList.remove('focused');
            }
        });
    });
    
    // Mostra informações sobre requisitos de senha na primeira visita
    setTimeout(() => {
        showMessage('Dica: Use uma senha com pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e símbolos.', 'success');
    }, 1000);
});