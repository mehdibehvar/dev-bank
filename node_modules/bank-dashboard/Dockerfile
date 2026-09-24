FROM node:20-alpine AS builder
WORKDIR /app
COPY web/bank-dashboard/package*.json ./
COPY web/bank-dashboard/tsconfig*.json ./
COPY packages/shared ./packages/shared
RUN npm install
COPY web/bank-dashboard/src ./src
COPY web/bank-dashboard/index.html ./
COPY web/bank-dashboard/vite.config.ts ./
COPY web/bank-dashboard/postcss.config.js ./
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY ../nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
