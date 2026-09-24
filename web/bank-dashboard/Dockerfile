FROM node:20-alpine AS builder

WORKDIR /app

COPY web/bank-dashboard/package.json ./
RUN npm install

COPY web/bank-dashboard/tsconfig.json web/bank-dashboard/tsconfig.app.json web/bank-dashboard/tsconfig.node.json web/bank-dashboard/vite.config.ts ./
COPY web/bank-dashboard/index.html ./
COPY web/bank-dashboard/src ./src
COPY web/bank-dashboard/nginx.conf ./nginx.conf

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
