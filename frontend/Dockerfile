# ═══════════════════════════════════════════════════════════════════════════════
#  Yaksha FAQ Portal — Frontend Dockerfile
#  Multi-stage: Vite build → Nginx serving static SPA
# ═══════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Build the Vite SPA ──────────────────────────────────────────────
FROM node:22-alpine AS build

RUN npm install -g pnpm@9

WORKDIR /app

# Copy root workspace configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json turbo.json ./

# Copy package configurations
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/validation/package.json ./packages/validation/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ ./packages/
COPY frontend/ ./frontend/

# Build frontend static bundle
RUN pnpm build --filter=yaksha-faq-frontend

# ── Stage 2: Serve with Nginx ────────────────────────────────────────────────
FROM nginx:1.27-alpine AS serve

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config (SPA routing + API proxy)
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from build stage
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Nginx runs on port 80
EXPOSE 80

# Healthcheck — hit the nginx-health endpoint
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -qO- http://localhost/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
