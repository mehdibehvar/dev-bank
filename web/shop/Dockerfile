FROM node:20-alpine AS builder

WORKDIR /app

COPY web/shop/package.json ./
RUN npm install

COPY web/shop/tsconfig.json web/shop/tsconfig.app.json web/shop/tsconfig.node.json web/shop/vite.config.ts ./
COPY web/shop/index.html ./
COPY web/shop/src ./src
COPY web/shop/nginx.conf ./nginx.conf

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
