# ─── Stage 1: builder ─────────────────────────────────────────────────────────
# Full install + client build. Needs native build tools for better-sqlite3.
# node:22-alpine
FROM node:26-alpine@sha256:143494b1da2945f061539253adc65e4f1569ddf07da2d384c022c791a9d90a4a AS builder

# Build tools required to compile better-sqlite3 native addon
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy manifests first for layer caching
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm ci

# Copy source
COPY server/ ./server/
COPY client/ ./client/

# Build Vue client → server/public/
RUN npm run build

# ─── Stage 2: runtime ─────────────────────────────────────────────────────────
# Lean production image — no devDeps, no client tooling, no build tools.
# node:22-alpine
FROM node:26-alpine@sha256:143494b1da2945f061539253adc65e4f1569ddf07da2d384c022c791a9d90a4a AS runtime

RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy manifests for production install
COPY package.json package-lock.json ./
COPY server/package.json ./server/

# Install server production deps only
RUN npm ci --workspace=server --omit=dev && \
    apk del python3 make g++

# Copy server source and built client (from builder)
COPY --from=builder /app/server/src ./server/src
COPY --from=builder /app/server/public ./server/public

# ─── Persistent data ──────────────────────────────────────────────────────────
# Mount a volume at /data for all persistent state. Created and owned by the
# non-root node user (uid 1000) before VOLUME so named volumes inherit it.
# Host bind mounts must be owned by uid 1000.
RUN mkdir -p /data/uploads /data/backups && chown -R node:node /data
VOLUME ["/data"]

ENV DB_PATH=/data/hopstock.db
ENV UPLOADS_DIR=/data/uploads
ENV BACKUP_DIR=/data/backups
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server/src/index.js"]
