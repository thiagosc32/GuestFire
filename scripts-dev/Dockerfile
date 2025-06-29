# Dockerfile para o Sistema de Login
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Criar diretório do banco de dados
RUN mkdir -p database

# Inicializar banco de dados
RUN npm run init-db

# Expor porta
EXPOSE 3000

# Definir usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Comando para iniciar a aplicação
CMD ["npm", "start"]