FROM node:20-alpine AS builder
WORKDIR /app
COPY web/shop/package*.json ./
COPY web/shop/tsconfig*.json ./
RUN npm ci
COPY web/shop/index.html .
COPY web/shop/src ./src
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY web/shop/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
