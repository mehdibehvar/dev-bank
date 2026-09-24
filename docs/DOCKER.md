# Docker Setup

This document describes the Docker build configuration for DEV Bank.

## Project Structure

```
dev-bank/
├── docker-compose.yml          # All services defined here
├── packages/
│   └── shared/                 # Shared TypeScript types and utilities
├── services/
│   ├── bank/                   # Local Bank API (port 3001)
│   ├── gateway/                # Payment Gateway API (port 3000)
│   └── shop/                   # Shop Backend API (port 4000)
├── web/
│   ├── dashboard/              # Merchant Dashboard (port 5173)
│   ├── shop/                   # Demo Shop Frontend (port 5174)
│   └── bank-dashboard/         # Bank Admin Dashboard (port 5175)
```

## Build Context

All services use the **project root** (`.`) as the Docker build context, with service-specific Dockerfiles:

```yaml
bank:
  build:
    context: .
    dockerfile: services/bank/Dockerfile
```

This allows each Dockerfile to access:
- The shared package (`packages/shared/`)
- The root `tsconfig.json` (extended by service tsconfigs)
- The service's own source code (`services/<name>/`)

## Backend Service Dockerfiles

Backend services use a **two-stage build**:

1. **Shared builder stage**: Installs dependencies and compiles the `@dev-bank/shared` package. This package provides shared types and utilities (`generateId`, `hashKey`, etc.) used across all services.

2. **Service stage**: 
   - Copies the service's `package.json`
   - Temporarily removes `@dev-bank/shared` from dependencies (it's not published to npm registry)
   - Runs `npm install` to install all other dependencies
   - Copies the built shared package into `node_modules/@dev-bank/shared/`
   - Copies the root `tsconfig.json` (needed by service tsconfig `extends`)
   - Compiles the service with `npm run build`

The shared package resolution workaround is needed because the project uses npm workspaces for local development (creating `node_modules/@dev-bank/shared` → symlink to `packages/shared/`). In Docker, there's no workspace symlink, so the shared package is built in a separate stage and copied into `node_modules/`.

## Web Frontend Dockerfiles

Web frontends use a **single-stage build** with multi-stage caching:

1. **Builder stage**: Installs npm dependencies, builds the React app with Vite
2. **Production stage**: Uses nginx-alpine to serve the static files

The web frontends don't depend on `@dev-bank/shared` at build time. They communicate with the backend APIs over HTTP at runtime.

## Starting All Services

```bash
docker compose up -d --build
```

Wait for PostgreSQL health checks to pass before services become fully available (~10 seconds after start).
