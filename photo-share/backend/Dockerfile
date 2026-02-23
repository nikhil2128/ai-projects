# Multi-stage build for minimal production image
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src/ src/

RUN npm run build
RUN npm prune --production

# Production image
FROM node:20-alpine AS production

RUN apk add --no-cache \
    # Required by sharp for image processing
    vips-dev \
    # Security: run as non-root
    && addgroup -g 1001 -S app \
    && adduser -S app -u 1001

WORKDIR /app

COPY --from=builder --chown=app:app /app/dist dist/
COPY --from=builder --chown=app:app /app/node_modules node_modules/
COPY --from=builder --chown=app:app /app/package.json package.json

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health/live || exit 1

CMD ["node", "dist/main.js"]
