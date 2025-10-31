# Usando Node.js oficial
FROM node:20

# Diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar o restante do código
COPY . .

# Expor porta
EXPOSE 3000

# Comando para iniciar
CMD ["node", "server.js"]
