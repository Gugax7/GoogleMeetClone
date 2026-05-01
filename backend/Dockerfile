# Usa uma versão leve do Node.js
FROM node:20-alpine

# Define a pasta de trabalho dentro do contêiner
WORKDIR /server

# Copia os arquivos de dependência primeiro
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o resto do código
COPY . .

# Expõe a porta 3000
EXPOSE 3000

# Comando para rodar o servidor com hot-reload (ts-node-dev)
CMD ["npx", "ts-node-dev", "server.ts"]