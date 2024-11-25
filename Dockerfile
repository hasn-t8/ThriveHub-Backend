FROM node:18-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --legacy-peer-deps
RUN ls -la node_modules/@types


COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/server.js"]
