# ─── Stage 1: builder ─────────────────────────────────────────────────────────
# Full install + client build. Needs native build tools for better-sqlite3.
FROM node:22-alpine AS builder

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
FROM node:22-alpine AS runtime

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
# Mount a volume at /data for all persistent state.
# The app will create subdirectories on first run.
VOLUME ["/data"]

ENV DB_PATH=/data/hopstock.db
ENV UPLOADS_DIR=/data/uploads
ENV BACKUP_DIR=/data/backups
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server/src/index.js"]
