# 🚀 Scripts de Desenvolvimento

Esta pasta contém todos os scripts e arquivos necessários para inicializar automaticamente o sistema de login durante o desenvolvimento.

## 📁 Estrutura dos Arquivos

### Scripts de Inicialização por Plataforma
- **`start.bat`** - Script para Windows (Batch)
- **`start.ps1`** - Script para Windows (PowerShell)
- **`start.sh`** - Script para Linux/macOS (Bash)
- **`iniciar.js`** - Script universal multiplataforma (Node.js)

### Containerização
- **`Dockerfile`** - Configuração para criar imagem Docker
- **`docker-compose.yml`** - Orquestração de containers

### Documentação
- **`INICIALIZACAO.md`** - Guia completo de inicialização
- **`README.md`** - Este arquivo

## 🎯 Como Usar

### Método Recomendado (NPM Scripts)
```bash
# Inicialização automática completa
npm run iniciar

# Modo desenvolvimento (com auto-reload)
npm run iniciar:dev

# Com Docker
npm run iniciar:docker
```

### Scripts Específicos por Plataforma

#### Windows
```bash
# Opção 1: Batch
scripts-dev/start.bat

# Opção 2: PowerShell
scripts-dev/start.ps1

# Opção 3: Universal
node scripts-dev/iniciar.js
```

#### Linux/macOS
```bash
# Torne executável (primeira vez)
chmod +x scripts-dev/start.sh

# Execute
./scripts-dev/start.sh

# Ou universal
node scripts-dev/iniciar.js
```

### Docker
```bash
# Usando docker-compose
docker-compose -f scripts-dev/docker-compose.yml up --build

# Ou usando o script universal
node scripts-dev/iniciar.js --docker
```

## 🔧 Funcionalidades dos Scripts

Todos os scripts realizam automaticamente:

1. **Verificação de pré-requisitos** (Node.js, npm)
2. **Instalação de dependências** (se necessário)
3. **Inicialização do banco de dados**
4. **Início do servidor**
5. **Exibição das URLs disponíveis**

## 📋 URLs do Sistema

Após a inicialização:
- **Login**: http://localhost:3000/
- **Registro**: http://localhost:3000/register.html
- **Dashboard**: http://localhost:3000/dashboard.html
- **Admin**: http://localhost:3000/admin.html

## 🛠️ Desenvolvimento

Para desenvolvimento com auto-reload:
```bash
npm run iniciar:dev
# ou
node scripts-dev/iniciar.js --dev
```

## 📞 Suporte

Consulte o arquivo `INICIALIZACAO.md` para:
- Guia detalhado de uso
- Solução de problemas
- Configurações avançadas
- Credenciais padrão do sistema