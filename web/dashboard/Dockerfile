FROM node:20-alpine AS builder

WORKDIR /app

COPY web/dashboard/package.json web/dashboard/tailwind.config.js web/dashboard/postcss.config.cjs ./
RUN npm install

COPY web/dashboard/tsconfig.json web/dashboard/tsconfig.app.json web/dashboard/tsconfig.node.json web/dashboard/vite.config.ts ./
COPY web/dashboard/index.html ./
COPY web/dashboard/src ./src
COPY web/dashboard/nginx.conf ./nginx.conf

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
