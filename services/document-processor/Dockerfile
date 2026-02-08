# ============================================
# BSM Document Processor - Multi-Stage Dockerfile
# Go microservice for high-performance document processing
# ============================================

# ====== Stage 1: Builder ======
FROM golang:1.22-alpine AS builder

# Add build dependencies
RUN apk add --no-cache git ca-certificates

# Set working directory
WORKDIR /build

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build binary with optimizations
RUN CGO_ENABLED=0 GOOS=linux go build \
    -a -installsuffix cgo \
    -ldflags '-s -w -extldflags "-static"' \
    -o server \
    ./cmd/server/main.go

# ====== Stage 2: Production ======
FROM alpine:3.19

# Add runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Create non-root user
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001 -G appuser

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /build/server .

# Change ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Set environment
ENV PORT=8080 \
    LOG_LEVEL=info \
    MAX_FILE_SIZE=52428800 \
    WORKERS=10

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD ["/app/server", "-health-check"] || exit 1

# Run server
CMD ["/app/server"]
