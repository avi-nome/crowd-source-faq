# ═══════════════════════════════════════════════════════════════════════════════
#  Yaksha FAQ Portal — Backend Dockerfile
#  Multi-stage: dependency install → lean runtime with Infisical CLI
# ═══════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Install dependencies ─────────────────────────────────
FROM node:22-bookworm-slim AS deps

# Install system dependencies needed to build native node modules
# (bcryptjs, @huggingface/transformers ONNX runtime, sharp, etc.)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@9

WORKDIR /app

# Copy root workspace configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json turbo.json ./

# Copy package configurations
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/validation/package.json ./packages/validation/
COPY backend/package.json ./backend/

# Install dependencies (only configs copied so far for caching)
RUN pnpm install --frozen-lockfile

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

RUN npm install -g pnpm@9

WORKDIR /app

# Install curl (healthchecks), gnupg/ca-certificates (Infisical)
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    lsb-release \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Infisical CLI for secret injection at runtime
RUN curl -1sLf \
    'https://artifacts-cli.infisical.com/setup.deb.sh' \
    | bash && \
    apt-get update && apt-get install -y infisical \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace dependencies & cached store from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/backend ./backend
COPY --from=deps /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/tsconfig.base.json /app/turbo.json ./

# Copy actual source files
COPY packages/ ./packages/
COPY backend/ ./backend/

# Re-run install to make sure all symlinks (workspaces) are properly linked
RUN pnpm install --frozen-lockfile --offline

# Create logs directory
RUN mkdir -p /app/logs

# Set working directory to backend
WORKDIR /app/backend

# Expose the backend API port
EXPOSE 6767

# Healthcheck — hit the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=15s \
    CMD curl -sf http://localhost:6767/api/health || exit 1

# Run the server using tsx (TypeScript executor from node_modules)
CMD ["node", "--import", "tsx", "src/server.ts"]
