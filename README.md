# Página de Login - Projeto de Aprendizado

Um projeto simples de página de login criado para fins educacionais, demonstrando conceitos básicos de desenvolvimento web front-end.

## 📋 Características

- **Sistema Completo de Autenticação**: Login e cadastro funcionais
- **Design Responsivo**: Adaptável a diferentes tamanhos de tela
- **Interface Moderna**: Design limpo com gradientes e efeitos visuais
- **Validação Avançada**: Validação em tempo real com critérios de segurança
- **Gerenciamento de Usuários**: Cadastro e armazenamento local de usuários
- **Dashboard Funcional**: Área restrita pós-login
- **Funcionalidade "Lembrar"**: Salva o email do usuário no localStorage
- **Feedback Visual**: Mensagens de sucesso e erro
- **Animações Suaves**: Transições CSS para melhor experiência do usuário

## 🚀 Como executar

### Inicialização Automática (Recomendado)

**Método mais simples:**
```bash
# Inicialização completa automática
npm run iniciar

# Ou para desenvolvimento (com auto-reload)
npm run iniciar:dev

# Ou com Docker
npm run iniciar:docker
```

**Scripts específicos por plataforma:**
- **Windows**: Execute `scripts-dev/start.bat` ou `scripts-dev/start.ps1`
- **Linux/macOS**: Execute `./scripts-dev/start.sh`
- **Universal**: Execute `node scripts-dev/iniciar.js`

### Inicialização Manual

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Execute o script de inicialização do banco de dados:
   ```bash
   npm run init-db
   ```
4. Inicie o servidor:
   ```bash
   npm start
   ```
5. Acesse `http://localhost:3000` no seu navegador

### Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run iniciar` | Inicialização automática completa |
| `npm run iniciar:dev` | Inicialização para desenvolvimento |
| `npm run iniciar:docker` | Inicialização com Docker |
| `npm run quick-start` | Setup + iniciar servidor |
| `npm run dev-start` | Setup + modo desenvolvimento |
| `npm run setup` | Apenas instalação e configuração |

📖 **Para mais detalhes, consulte o arquivo [INICIALIZACAO.md](scripts-dev/INICIALIZACAO.md)**

## 🔧 Como Usar

1. **Abrir o Projeto**:
   - Abra o arquivo `index.html` em qualquer navegador web moderno
   - Ou use um servidor local para melhor experiência



3. **Funcionalidades Disponíveis**:
   - **Login**: Validação de email e senha
   - **Cadastro**: Criação de novas contas com validação robusta
   - **Dashboard**: Área restrita com informações do usuário
   - **Validação de Senha**: Critérios de segurança (maiúsculas, minúsculas, números, símbolos)
   - **Gerenciamento de Sessão**: Controle de acesso e logout
   - **Opção "Lembrar de mim"**: Salva email no navegador

## 📁 Estrutura do Projeto

```
frontback/
├── index.html      # Página de login
├── register.html   # Página de cadastro
├── dashboard.html  # Dashboard pós-login
├── styles.css      # Estilos CSS compartilhados
├── script.js       # Lógica JavaScript do login
├── register.js     # Lógica JavaScript do cadastro
└── README.md       # Documentação
```

## 🛠️ Tecnologias Utilizadas

- **HTML5**: Estrutura semântica da página
- **CSS3**: Estilização com flexbox, gradientes e animações
- **JavaScript**: Validação, interatividade e localStorage

## 📱 Responsividade

O projeto é totalmente responsivo e funciona bem em:
- 💻 Desktop
- 📱 Tablets
- 📱 Smartphones

## 🎨 Características do Design

- **Cores**: Gradiente roxo/azul moderno
- **Tipografia**: Arial clean e legível
- **Efeitos**: Glassmorphism com backdrop-filter
- **Animações**: Hover effects e transições suaves

## 🔧 Funcionalidades JavaScript

### Login (script.js)
- Validação de formulário em tempo real
- Autenticação com contas criadas ou credenciais padrão
- Gerenciamento de sessão com localStorage
- Redirecionamento automático para dashboard

### Cadastro (register.js)
- Validação robusta de senha (8+ caracteres, maiúsculas, minúsculas, números, símbolos)
- Verificação de email duplicado
- Validação de nome completo
- Confirmação de senha em tempo real
- Armazenamento seguro de usuários

### Dashboard
- Verificação de autenticação
- Exibição de informações do usuário
- Controle de sessão e logout
- Interface administrativa

## 📚 Conceitos de Aprendizado

Este projeto demonstra:

1. **HTML Semântico**: Uso correto de tags e atributos
2. **CSS Moderno**: Flexbox, gradientes, animações, glassmorphism
3. **JavaScript ES6+**: Event listeners, arrow functions, template literals
4. **Gerenciamento de Estado**: localStorage para persistência de dados
5. **Validação de Formulários**: Regex, validação em tempo real
6. **Roteamento Simples**: Navegação entre páginas
7. **Autenticação Frontend**: Simulação de sistema de login
8. **UX/UI**: Feedback visual, estados de loading, indicadores de força
9. **Responsividade**: Media queries e design adaptativo
10. **Acessibilidade**: Labels, foco visual, navegação por teclado

## 🚀 Possíveis Melhorias

Para expandir o projeto, considere adicionar:

- **Backend Real**: API REST com Node.js, Python ou PHP
- **Banco de Dados**: MySQL, PostgreSQL ou MongoDB
- **Criptografia**: Hash de senhas com bcrypt
- **JWT**: Tokens de autenticação seguros
- **Recuperação de Senha**: Sistema de reset por email
- **Autenticação Social**: Login com Google, Facebook, GitHub
- **Perfil de Usuário**: Edição de dados pessoais
- **Roles e Permissões**: Sistema de autorização
- **Temas**: Modo claro/escuro
- **PWA**: Progressive Web App
- **Testes**: Jest, Cypress para testes automatizados
- **Deploy**: Hospedagem em Vercel, Netlify ou AWS

## 📄 Licença

Este projeto é livre para uso educacional e pessoal.

---

**Desenvolvido para aprendizado** 🎓
