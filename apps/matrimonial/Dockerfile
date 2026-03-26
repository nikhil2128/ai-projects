# ── Stage 1: Build frontend ──────────────────────────────────────────
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --ignore-scripts

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Build backend ───────────────────────────────────────────
FROM node:22-alpine AS backend-build
WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --ignore-scripts

COPY backend/ ./
RUN npm run build

# ── Stage 3: Production image ────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm install --omit=dev --ignore-scripts

COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=frontend-build /app/frontend/dist ./public

ENV NODE_ENV=production
ENV SERVE_STATIC=/app/public
ENV PORT=8080

USER appuser
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/health || exit 1

CMD ["node", "backend/dist/index.js"]
