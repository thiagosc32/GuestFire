// Configurações
// Detecta automaticamente a URL base para funcionar tanto no localhost quanto na rede
// Detecta se estamos usando localtunnel ou localhost
const isLocaltunnel = window.location.hostname.includes('.loca.lt');
const API_BASE_URL = isLocaltunnel 
    ? `${window.location.protocol}//${window.location.hostname}/api`
    : `${window.location.protocol}//${window.location.hostname}:${window.location.port || '3000'}/api`;

// Função para alternar visibilidade da senha
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eye-icon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        // Ícone de olho fechado (senha visível)
        eyeIcon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        `;
    } else {
        passwordInput.type = 'password';
        // Ícone de olho aberto (senha oculta)
        eyeIcon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        `;
    }
}

// Aguarda o carregamento completo da página
document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('remember');
    const messageDiv = document.getElementById('message-area');

    // Função para mostrar mensagens
    function showMessage(message, type = 'error') {
        messageDiv.textContent = message;
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

    // Função para validar formulário
    function validateForm() {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!email) {
            showMessage('Por favor, insira seu email.');
            emailInput.focus();
            return false;
        }
        
        if (!isValidEmail(email)) {
            showMessage('Por favor, insira um email válido.');
            emailInput.focus();
            return false;
        }
        
        if (!password) {
            showMessage('Por favor, insira sua senha.');
            passwordInput.focus();
            return false;
        }
        
        return true;
    }

    // Função para fazer login via API
    async function attemptLogin(email, password, rememberMe) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    rememberMe: rememberMe
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Salva o token e informações do usuário
                const sessionData = {
                    token: data.data.token,
                    user: data.data.user,
                    loginTime: new Date().toISOString(),
                    rememberMe: data.data.rememberMe
                };
                
                if (data.data.rememberMe) {
                    localStorage.setItem('userSession', JSON.stringify(sessionData));
                } else {
                    sessionStorage.setItem('userSession', JSON.stringify(sessionData));
                }
                
                return { success: true, message: data.message };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Erro no login:', error);
            return { success: false, message: 'Erro de conexão com o servidor. Tente novamente.' };
        }
    }

    // Função para processar o login
    async function processLogin(email, password, rememberMe) {
        const result = await attemptLogin(email, password, rememberMe);
        
        if (result.success) {
            showMessage('Login realizado com sucesso! Redirecionando...', 'success');
            
            // Redireciona para o dashboard após 1.5 segundos
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showMessage(result.message);
        }
    }

    // Event listener para o formulário
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const rememberMe = rememberMeCheckbox.checked;
        
        // Mostra mensagem de carregamento
        showMessage('Verificando credenciais...', 'info');
        
        // Processa o login
        processLogin(email, password, rememberMe);
    });

    // Adiciona efeitos visuais aos campos de input
    emailInput.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });

    emailInput.addEventListener('blur', function() {
        if (!this.value) {
            this.parentElement.classList.remove('focused');
        }
    });

    passwordInput.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });

    passwordInput.addEventListener('blur', function() {
        if (!this.value) {
            this.parentElement.classList.remove('focused');
        }
    });

    // Função para verificar se há sessão ativa
    function checkActiveSession() {
        const sessionData = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
        
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                if (session.token && session.user) {
                    showMessage(`Bem-vindo de volta, ${session.user.fullName}! Redirecionando...`, 'success');
                    
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 2000);
                    return true;
                }
            } catch (error) {
                // Remove sessão inválida
                localStorage.removeItem('userSession');
                sessionStorage.removeItem('userSession');
            }
        }
        return false;
    }

    // Verifica sessão ativa ao carregar a página
    checkActiveSession();
});