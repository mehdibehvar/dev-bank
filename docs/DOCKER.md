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

Web frontends use a **multi-stage build** (builder + nginx):

1. **Builder stage**: Installs npm dependencies, builds the React app with Vite
2. **Production stage**: Uses nginx-alpine to serve the static files

The web frontends don't depend on `@dev-bank/shared` at build time. They communicate with the backend APIs over HTTP at runtime.

### Tailwind CSS Configuration

Each web app includes:
- `tailwind.config.js` - Tailwind CSS configuration (content paths, theme)
- `postcss.config.cjs` - PostCSS plugin configuration using `@tailwindcss/postcss` (required for Tailwind CSS v4)

Both files are copied in the Dockerfile's builder stage alongside `package.json` to ensure the CSS build pipeline works correctly.

### CSS Processing

Vite processes CSS through PostCSS (configured via `postcss.config.cjs`). The `@tailwindcss/postcss` package (added as a dev dependency) handles the `@tailwind` directives in `index.css`, compiling them into utility classes based on the `tailwind.config.js` content configuration.

## Common Docker Build Issues

### npm ci Requires package-lock.json

Service-level directories don't have `package-lock.json` files (only the root monorepo does). Docker builds use `npm install` instead of `npm ci` to avoid this requirement.

### TypeScript `extends` Path Resolution

Service-level `tsconfig.json` files `extends "../../tsconfig.json"` (root). In Docker builds, the root `tsconfig.json` must be copied to `/app/tsconfig.json` so TypeScript can resolve the extends path.

### npm Workspace Dependencies

Backend services import from `@dev-bank/shared` (an npm workspace package). In Docker:
1. The shared package is built in a separate stage (`shared-builder`)
2. The `@dev-bank/shared` entry is removed from the service's `package.json` before `npm install`
3. The built shared package's `dist/` and `package.json` are placed in `node_modules/@dev-bank/shared/`

## Starting All Services

```bash
docker compose up -d --build
```

Wait for PostgreSQL health checks to pass before services become fully available (~10 seconds after start).
