FROM node:20-alpine

WORKDIR /server

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 4000

CMD ["npx", "ts-node-dev", "server.ts"]