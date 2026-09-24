FROM node:20-alpine AS builder
WORKDIR /app
COPY web/dashboard/package*.json ./
COPY web/dashboard/tsconfig*.json ./
RUN npm ci
COPY web/dashboard/index.html .
COPY web/dashboard/src ./src
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY web/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
