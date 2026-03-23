# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine

# Install FFmpeg (required for video processing)
RUN apk add --no-cache ffmpeg

WORKDIR /app

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist/

RUN mkdir -p /tmp/video-merger && chown -R appuser:appgroup /app /tmp/video-merger

USER appuser

EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3004/health || exit 1

CMD ["node", "dist/index.js"]
