# Multi-stage Dockerfile for BSM-AgentOS
# Optimized for production deployment

# Stage 1: Base image with dependencies
FROM node:22-alpine AS base
LABEL maintainer="LexBANK <dev@lexdo.uk>"
LABEL description="BSM-AgentOS - The Smartest AI Agent Platform"

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    postgresql-client \
    curl \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Development dependencies
FROM base AS dependencies
RUN npm ci && npm cache clean --force

# Stage 3: Application
FROM base AS application

# Copy application code
COPY . .

# Copy node_modules from base
COPY --from=base /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose ports
EXPOSE 3000 8501

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Default command
CMD ["node", "src/server.js"]

# Stage 4: Production
FROM application AS production
ENV NODE_ENV=production

# Stage 5: Dashboard (Streamlit)
FROM python:3.11-slim AS dashboard
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dashboard requirements
COPY src/dashboard/streamlit/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy dashboard code
COPY src/dashboard/streamlit/ ./

# Create non-root user
RUN useradd -m -u 1001 streamlit && \
    chown -R streamlit:streamlit /app

USER streamlit

EXPOSE 8501

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8501/_stcore/health || exit 1

CMD ["streamlit", "run", "app.py"]
