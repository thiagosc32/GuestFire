# 🚀 Guia de Inicialização do Sistema de Login

Este guia contém todas as formas de inicializar automaticamente o sistema de login.

## 📋 Pré-requisitos

- **Node.js** (versão 14 ou superior) - [Download aqui](https://nodejs.org/)
- **npm** (incluído com Node.js)

## 🎯 Métodos de Inicialização

### 1. Scripts Automáticos (Recomendado)

#### Windows

**Opção A: Script Batch (.bat)**
```bash
# Duplo clique no arquivo ou execute no terminal:
start.bat
```

**Opção B: Script PowerShell (.ps1)**
```powershell
# Execute no PowerShell:
.\start.ps1

# Ou se houver problemas de execução:
PowerShell -ExecutionPolicy Bypass -File start.ps1
```

#### Linux/macOS

```bash
# Torne o script executável (apenas na primeira vez):
chmod +x start.sh

# Execute o script:
./start.sh
```

### 2. Scripts NPM

```bash
# Instalação completa + inicialização do banco + servidor
npm run quick-start

# Para desenvolvimento (com nodemon)
npm run dev-start

# Apenas configuração inicial
npm run setup
```

### 3. Inicialização Manual

```bash
# 1. Instalar dependências
npm install

# 2. Inicializar banco de dados
npm run init-db

# 3. Iniciar servidor
npm start
```

## 🌐 URLs do Sistema

Após a inicialização, o sistema estará disponível em:

- **Página de Login**: http://localhost:3000/
- **Registro de Usuário**: http://localhost:3000/register.html
- **Dashboard do Usuário**: http://localhost:3000/dashboard.html
- **Painel Administrativo**: http://localhost:3000/admin.html

## 👤 Credenciais Padrão

### Usuário Administrador
- **Email**: thiagosc31@hotmail.com
- **Senha**: Janeiro312002
- **Nível**: Administrador Master (nível 2)

### Usuário Administrador Secundário
- **Email**: thiagosc31@hotmail.com
- **Nível**: Administrador Master (nível 2)

## 🛠️ Solução de Problemas

### Erro: "Node.js não encontrado"
- Instale o Node.js em: https://nodejs.org/
- Reinicie o terminal após a instalação

### Erro: "Porta 3000 já está em uso"
- Pare outros servidores rodando na porta 3000
- Ou modifique a porta no arquivo `server.js`

### Erro de Permissão no PowerShell
```powershell
# Execute como administrador:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Banco de Dados Corrompido
```bash
# Delete o arquivo do banco e reinicialize:
rm database/users.db
npm run init-db
```

## 📁 Estrutura do Projeto

```
frontback/
├── start.bat           # Script Windows (Batch)
├── start.ps1           # Script Windows (PowerShell)
├── start.sh            # Script Linux/macOS
├── server.js           # Servidor principal
├── package.json        # Configurações e scripts npm
├── database/           # Banco de dados SQLite
├── routes/             # Rotas da API
├── scripts/            # Scripts utilitários
└── *.html              # Páginas frontend
```

## 🔧 Scripts Disponíveis

| Script | Descrição |
|--------|----------|
| `npm start` | Inicia apenas o servidor |
| `npm run dev` | Inicia com nodemon (desenvolvimento) |
| `npm run init-db` | Inicializa o banco de dados |
| `npm run setup` | Instala dependências + inicializa DB |
| `npm run quick-start` | Setup completo + inicia servidor |
| `npm run dev-start` | Setup completo + modo desenvolvimento |

## 📞 Suporte

Se encontrar problemas:
1. Verifique se o Node.js está instalado corretamente
2. Certifique-se de que a porta 3000 está livre
3. Execute `npm run setup` para reconfigurar o projeto
4. Consulte os logs de erro no terminal

---

**Dica**: Para desenvolvimento, use `npm run dev-start` que reinicia automaticamente o servidor quando você faz alterações no código!