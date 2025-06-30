# 🛡️ Guia do Administrador - Sistema de Login e Registro

## 📋 Visão Geral

Este documento contém informações específicas para administradores do sistema, incluindo como acessar dados dos usuários, gerenciar contas e monitorar o sistema.

## 🔐 Acesso Administrativo

### Credenciais do Administrador
- **Email:** `thiagosc31@hotmail.com`
- **Senha:** `Janeiro312002`

> ⚠️ **IMPORTANTE:** Altere a senha padrão após o primeiro acesso por questões de segurança.

### Como Acessar o Painel Administrativo

1. **Inicie o servidor:**
   ```bash
   node server.js
   ```

2. **Acesse o painel em:**
   ```
   http://localhost:3000/admin.html
   ```

3. **Faça login** com as credenciais de administrador

## 🎛️ Funcionalidades do Painel Administrativo

### 📊 Dashboard de Estatísticas

O painel exibe em tempo real:
- **Total de usuários** cadastrados no sistema
- **Usuários aguardando oração** (contas habilitadas)
- **Usuários inativos** (contas desabilitadas)
- **Novos usuários hoje**
- **Novos usuários esta semana**
- **Total de logins hoje**

### 👥 Gerenciamento de Usuários

#### Listar Usuários
- Visualização em tabela com paginação
- Busca por nome ou email
- Informações exibidas:
  - ID do usuário
  - Nome completo
  - Email
  - Status (Ativo/Inativo)
  - Data de criação

#### Ações Disponíveis

1. **Ver Detalhes do Usuário:**
   - Clique no botão "Ver" para visualizar:
     - Informações completas do perfil
     - Histórico dos últimos 10 logins
     - Data de criação e última atualização

2. **Ativar/Desativar Usuários:**
   - Use os botões "Ativar" ou "Desativar"
   - Usuários inativos não conseguem fazer login
   - ⚠️ O administrador não pode desativar a própria conta

## 🔧 API Administrativa

### Endpoints Disponíveis

Todas as rotas requerem autenticação com token JWT do administrador.

#### 1. Listar Usuários
```http
GET /api/users/admin/users
```

**Parâmetros de Query:**
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 10)
- `search` (opcional): Busca por nome ou email

**Exemplo:**
```bash
curl -H "Authorization: Bearer SEU_TOKEN" \
     "http://localhost:3000/api/users/admin/users?page=1&limit=10&search=joão"
```

#### 2. Detalhes de um Usuário
```http
GET /api/users/admin/users/:id
```

**Exemplo:**
```bash
curl -H "Authorization: Bearer SEU_TOKEN" \
     "http://localhost:3000/api/users/admin/users/1"
```

#### 3. Alterar Status do Usuário
```http
PUT /api/users/admin/users/:id/status
```

**Body:**
```json
{
  "isActive": true
}
```

**Exemplo:**
```bash
curl -X PUT \
     -H "Authorization: Bearer SEU_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"isActive": false}' \
     "http://localhost:3000/api/users/admin/users/1/status"
```

#### 4. Estatísticas do Sistema
```http
GET /api/users/admin/stats
```

**Exemplo:**
```bash
curl -H "Authorization: Bearer SEU_TOKEN" \
     "http://localhost:3000/api/users/admin/stats"
```

## 🗄️ Acesso Direto ao Banco de Dados

### Localização do Banco
```
database/users.db
```

### Estrutura das Tabelas

#### Tabela `users`
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabela `sessions`
```sql
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Tabela `login_logs`
```sql
CREATE TABLE login_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    email TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Consultas SQL Úteis

#### Listar todos os usuários aguardando oração
```sql
SELECT * FROM users WHERE is_active = 1;
```

#### Verificar logins recentes
```sql
SELECT u.full_name, u.email, ll.success, ll.created_at 
FROM login_logs ll 
JOIN users u ON ll.user_id = u.id 
ORDER BY ll.created_at DESC 
LIMIT 10;
```

#### Estatísticas de usuários
```sql
-- Total de usuários
SELECT COUNT(*) as total_users FROM users;

-- Usuários aguardando oração
SELECT COUNT(*) as active_users FROM users WHERE is_active = 1;

-- Usuários criados hoje
SELECT COUNT(*) as today_users 
FROM users 
WHERE DATE(created_at) = DATE('now');
```

## 🔒 Segurança

### Medidas Implementadas

1. **Autenticação JWT:** Tokens com expiração de 24 horas
2. **Verificação de Permissões:** Apenas `thiagosc31@hotmail.com` pode acessar rotas administrativas
3. **Hash de Senhas:** Senhas armazenadas com bcrypt
4. **Log de Tentativas:** Todas as tentativas de login são registradas
5. **Proteção CORS:** Configurado para origens específicas

### Recomendações de Segurança

1. **Altere a senha padrão** do administrador
2. **Use HTTPS** em produção
3. **Configure firewall** para restringir acesso ao servidor
4. **Monitore logs** regularmente
5. **Faça backup** do banco de dados periodicamente
6. **Mantenha o sistema atualizado**

## 🚨 Solução de Problemas

### Problemas Comuns

#### 1. Não consigo acessar o painel administrativo
- Verifique se está logado com `thiagosc31@hotmail.com`
- Confirme se o servidor está rodando
- Limpe o cache do navegador

#### 2. Erro "Token inválido"
- Faça logout e login novamente
- Verifique se o token não expirou (24h)

#### 3. Usuários não aparecem na lista
- Verifique a conexão com o banco de dados
- Confirme se há usuários cadastrados

### Logs do Sistema

Para visualizar logs em tempo real:
```bash
# No terminal onde o servidor está rodando
# Os logs aparecerão automaticamente
```

## 📞 Suporte

Para questões técnicas ou problemas:
1. Verifique os logs do servidor
2. Consulte este documento
3. Verifique a integridade do banco de dados

---

**Última atualização:** $(date)
**Versão do Sistema:** 1.0.0