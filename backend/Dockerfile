FROM node:20-alpine

WORKDIR /app

COPY backend/src/package.json ./package.json
RUN npm install

COPY backend/src ./

EXPOSE 8080

CMD ["node", "cloudrun-server.js"]