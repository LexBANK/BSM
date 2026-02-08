# syntax=docker/dockerfile:1

# ============================================
# BSU Nexus - Multi-Stage Docker Build
# Frontend + Backend
# ============================================

# ====== Stage 1: Build chat frontend (if build script exists) ======
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY src/chat/package*.json ./
RUN if [ -f package.json ]; then npm ci --omit=dev; fi

COPY src/chat/ ./
RUN if [ -f package.json ] && npm run | grep -q " build"; then npm run build; fi \
 && mkdir -p dist build

# ====== Stage 2: Install server dependencies ======
FROM node:20-alpine AS server-builder
WORKDIR /app/server

COPY package*.json ./
RUN npm ci --omit=dev

# ====== Stage 3: Production image ======
FROM node:20-alpine AS production

RUN apk add --no-cache curl ca-certificates

RUN addgroup -g 1001 -S nodejs \
 && adduser -S bsm -u 1001 -G nodejs

WORKDIR /app

COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/package*.json ./

COPY src/ ./src/
COPY data/ ./data/
COPY docs/ ./docs/

# Copy frontend bundles if they were produced
COPY --from=frontend-builder /app/frontend/dist ./src/chat/dist
COPY --from=frontend-builder /app/frontend/build ./src/chat/build

RUN chown -R bsm:nodejs /app \
 && chmod -R 755 /app

USER bsm

ENV NODE_ENV=production \
    PORT=3000 \
    API_BASE=/api \
    HEALTH_CHECK_PATH=/api/health

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "src/server.js"]
