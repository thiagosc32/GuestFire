# Autenticação Social - Configuração

Este documento explica como configurar a autenticação social com Google, Facebook, GitHub e Apple no projeto.

## 📋 Pré-requisitos

- Node.js instalado
- Dependências do projeto instaladas (`npm install`)
- Banco de dados SQLite configurado

## 🔧 Configuração das Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure as seguintes variáveis:

```bash
cp .env.example .env
```

### Configurações Obrigatórias

```env
# Chave secreta para sessões (gere uma chave forte)
SESSION_SECRET=sua-chave-secreta-super-forte-aqui

# Configurações do Google OAuth
GOOGLE_CLIENT_ID=seu-google-client-id
GOOGLE_CLIENT_SECRET=seu-google-client-secret

# Configurações do Facebook OAuth
FACEBOOK_APP_ID=seu-facebook-app-id
FACEBOOK_APP_SECRET=seu-facebook-app-secret

# Configurações do GitHub OAuth
GITHUB_CLIENT_ID=seu-github-client-id
GITHUB_CLIENT_SECRET=seu-github-client-secret

# Configurações do Apple OAuth (mais complexo)
APPLE_CLIENT_ID=seu-apple-client-id
APPLE_TEAM_ID=seu-apple-team-id
APPLE_KEY_ID=seu-apple-key-id
APPLE_PRIVATE_KEY_PATH=./config/apple-private-key.p8
```

## 🚀 Como Obter as Credenciais

### 1. Google OAuth

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a API "Google+ API"
4. Vá em "Credenciais" > "Criar credenciais" > "ID do cliente OAuth 2.0"
5. Configure:
   - Tipo: Aplicação web
   - URIs de redirecionamento autorizados: `http://localhost:3000/auth/google/callback`
6. Copie o Client ID e Client Secret

### 2. Facebook OAuth

1. Acesse o [Facebook Developers](https://developers.facebook.com/)
2. Crie um novo app
3. Adicione o produto "Facebook Login"
4. Configure:
   - URIs de redirecionamento válidos: `http://localhost:3000/auth/facebook/callback`
5. Copie o App ID e App Secret

### 3. GitHub OAuth

1. Acesse [GitHub Settings](https://github.com/settings/developers)
2. Clique em "New OAuth App"
3. Configure:
   - Application name: Nome do seu app
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/auth/github/callback`
4. Copie o Client ID e Client Secret

### 4. Apple OAuth (Mais Complexo)

1. Acesse o [Apple Developer Portal](https://developer.apple.com/)
2. Crie um App ID
3. Configure Sign in with Apple
4. Crie uma Service ID
5. Gere uma chave privada (.p8)
6. Configure os domínios e URLs de retorno

**Nota:** A configuração do Apple é mais complexa e requer uma conta de desenvolvedor Apple paga.

## 🗄️ Estrutura do Banco de Dados

O sistema adiciona as seguintes colunas à tabela `users`:

- `google_id` - ID do usuário no Google
- `facebook_id` - ID do usuário no Facebook
- `github_id` - ID do usuário no GitHub
- `apple_id` - ID do usuário no Apple
- `auth_provider` - Provedor de autenticação usado

Para adicionar essas colunas, execute:

```bash
node scripts/add-social-auth-columns.js
```

## 🔗 URLs de Autenticação

Após a configuração, os usuários podem acessar:

- **Google:** `http://localhost:3000/auth/google`
- **Facebook:** `http://localhost:3000/auth/facebook`
- **GitHub:** `http://localhost:3000/auth/github`
- **Apple:** `http://localhost:3000/auth/apple`
- **Logout:** `http://localhost:3000/auth/logout`

## 🎨 Interface de Login

Os botões de login social foram adicionados à página `login.html` com:

- Design responsivo
- Ícones dos provedores
- Efeitos hover
- Cores das marcas

## 🔄 Fluxo de Autenticação

1. Usuário clica no botão do provedor
2. Redirecionamento para o provedor (Google, Facebook, etc.)
3. Usuário autoriza o aplicativo
4. Callback de retorno com dados do usuário
5. Sistema verifica se o usuário já existe
6. Se não existir, cria novo usuário
7. Login automático e redirecionamento para dashboard

## 🛡️ Segurança

- Sessões seguras com chave secreta
- Validação de dados do provedor
- Prevenção de ataques CSRF
- Sanitização de dados de entrada

## 🧪 Testando

1. Inicie o servidor: `npm start`
2. Acesse `http://localhost:3000/login.html`
3. Clique em um dos botões de login social
4. Complete o fluxo de autenticação
5. Verifique se foi redirecionado para o dashboard

## 🚨 Problemas Comuns

### Erro: "redirect_uri_mismatch"
- Verifique se as URLs de callback estão corretas nos consoles dos provedores
- Certifique-se de que não há barras extras ou diferenças de protocolo

### Erro: "invalid_client"
- Verifique se o Client ID e Client Secret estão corretos
- Confirme se as credenciais estão no arquivo `.env`

### Erro: "scope_error"
- Verifique se as permissões solicitadas estão habilitadas no console do provedor

## 📝 Próximos Passos

1. **Produção:** Configure URLs de produção nos consoles dos provedores
2. **HTTPS:** Use HTTPS em produção para maior segurança
3. **Personalização:** Customize a aparência dos botões
4. **Analytics:** Adicione tracking de conversão de login
5. **Testes:** Implemente testes automatizados

## 🤝 Suporte

Se encontrar problemas:

1. Verifique os logs do servidor
2. Confirme as configurações do `.env`
3. Teste com um provedor por vez
4. Consulte a documentação oficial dos provedores