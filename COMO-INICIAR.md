# 🚀 Como Iniciar o Sistema de Login

## Método Mais Rápido

### Windows
```bash
# Duplo clique no arquivo ou execute:
iniciar-rapido.bat
```

### Qualquer Sistema Operacional
```bash
# Inicialização automática completa
npm run iniciar

# Para desenvolvimento (com auto-reload)
npm run iniciar:dev
```

## 📁 Organização dos Arquivos

Todos os scripts de desenvolvimento foram organizados na pasta **`scripts-dev/`**:

```
scripts-dev/
├── README.md              # Documentação completa dos scripts
├── INICIALIZACAO.md       # Guia detalhado de inicialização
├── start.bat              # Script Windows (Batch)
├── start.ps1              # Script Windows (PowerShell)
├── start.sh               # Script Linux/macOS
├── iniciar.js             # Script universal (Node.js)
├── Dockerfile             # Configuração Docker
└── docker-compose.yml     # Orquestração de containers
```

## 🎯 Scripts Disponíveis

| Comando | Descrição |
|---------|----------|
| `npm run iniciar` | Inicialização automática completa |
| `npm run iniciar:dev` | Modo desenvolvimento (auto-reload) |
| `npm run iniciar:docker` | Inicialização com Docker |
| `iniciar-rapido.bat` | Atalho rápido para Windows |

## 📖 Documentação Completa

Para instruções detalhadas, consulte:
- **[scripts-dev/README.md](scripts-dev/README.md)** - Documentação dos scripts
- **[scripts-dev/INICIALIZACAO.md](scripts-dev/INICIALIZACAO.md)** - Guia completo

## 🌐 URLs do Sistema

Após inicializar, acesse:
- **Login**: http://localhost:3000/
- **Registro**: http://localhost:3000/register.html
- **Dashboard**: http://localhost:3000/dashboard.html
- **Admin**: http://localhost:3000/admin.html

## 👤 Credenciais Padrão

**Administrador:**
- Email: thiagosc31@hotmail.com
- Senha: Janeiro312002

---

**💡 Dica**: Use `npm run iniciar:dev` para desenvolvimento com auto-reload!