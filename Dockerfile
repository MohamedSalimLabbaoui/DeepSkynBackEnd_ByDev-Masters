# ============================================================
# DeepSkyn Backend — Multi-Stage Dockerfile
# ============================================================
# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install OS-level deps required by canvas/sharp/bcrypt native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    libpng-dev \
    libjpeg-turbo-dev

# Copy manifests first (layer caching)
COPY package*.json ./
COPY prisma ./prisma/

# Install all deps (including devDeps needed by the build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source
COPY . .

# Compile TypeScript
RUN npm run build

# ============================================================
# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

# Runtime OS deps
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    libpng \
    libjpeg-turbo \
    dumb-init

# Create non-root user
RUN addgroup -S deepskyn && adduser -S deepskyn -G deepskyn

# Copy only what's needed at runtime
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

# Own files as non-root user
RUN chown -R deepskyn:deepskyn /app
USER deepskyn

# Health check – NestJS Swagger endpoint always alive when app is up
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/api || exit 1

EXPOSE ${PORT:-3000}

# Use dumb-init to properly forward signals (graceful shutdown)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
