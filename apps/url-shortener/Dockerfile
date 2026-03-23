FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts=false
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache tini
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts=false
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3100
ENV DB_PATH=/app/data/urls.db

EXPOSE 3100
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
