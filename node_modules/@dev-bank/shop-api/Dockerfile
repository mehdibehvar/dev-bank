FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci --only=production=false

COPY src ./src
COPY ../packages/shared ../packages/shared

RUN npm run build

EXPOSE 4000

CMD ["node", "dist/index.js"]