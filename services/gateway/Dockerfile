# Build shared package first
FROM node:20-alpine AS shared-builder

WORKDIR /app
COPY tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src/

WORKDIR /app/packages/shared
RUN npm install && npm run build

# Build gateway service
FROM node:20-alpine

WORKDIR /app/services/gateway

COPY services/gateway/package.json ./
COPY services/gateway/tsconfig.json ./

# Temporarily remove @dev-bank/shared dep (provided manually below)
RUN node -e "const fs=require('fs');const pkg=JSON.parse(fs.readFileSync('package.json'));delete pkg.dependencies['@dev-bank/shared'];fs.writeFileSync('package.json',JSON.stringify(pkg,null,2)+'\n')"

RUN npm install

# Copy root tsconfig for path resolution
COPY tsconfig.json /app/tsconfig.json

# Copy built shared package into node_modules
COPY --from=shared-builder /app/packages/shared/dist ./node_modules/@dev-bank/shared/dist
COPY --from=shared-builder /app/packages/shared/package.json ./node_modules/@dev-bank/shared/package.json

COPY services/gateway/src ./src

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
