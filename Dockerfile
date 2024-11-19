# Stage 1: Build
FROM node:18-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/dist ./dist
COPY package*.json ./
RUN npm install --only=production

EXPOSE 3000

CMD ["node", "dist/server.js"]
