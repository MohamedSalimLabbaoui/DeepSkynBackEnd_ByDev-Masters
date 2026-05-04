FROM node:20-alpine AS builder
WORKDIR /app

# Build tools for native packages + OpenSSL for Prisma
RUN apk add --no-cache \
    python3 make g++ pkgconfig \
    cairo-dev pango-dev jpeg-dev giflib-dev \
    openssl

COPY package*.json ./
RUN npm ci

# Generate Prisma client before building
COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ── Production stage ──────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache \
    python3 make g++ pkgconfig \
    cairo-dev pango-dev jpeg-dev giflib-dev \
    openssl

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/src/main"]