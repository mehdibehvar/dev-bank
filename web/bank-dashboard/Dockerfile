FROM node:20-alpine AS builder
WORKDIR /app
COPY web/bank-dashboard/package*.json ./
COPY web/bank-dashboard/tsconfig*.json ./
RUN npm ci
COPY web/bank-dashboard/index.html .
COPY web/bank-dashboard/src ./src
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY web/bank-dashboard/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
