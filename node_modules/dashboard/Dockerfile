FROM node:20-alpine AS builder
WORKDIR /app
COPY web/dashboard/package*.json ./
COPY web/dashboard/tsconfig*.json ./
COPY packages/shared ./packages/shared
RUN npm install
COPY web/dashboard/src ./src
COPY web/dashboard/index.html ./
COPY web/dashboard/vite.config.ts ./
COPY web/dashboard/postcss.config.js ./
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY ../nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
