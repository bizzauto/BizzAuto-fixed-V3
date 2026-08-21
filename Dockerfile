FROM node:22-alpine AS builder

ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_API_URL

ENV NODE_ENV=development
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN apk add --no-cache openssl
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 --fetch-timeout=600000 && npx prisma generate

COPY . .

RUN rm -rf dist && npm run build:docker && find dist -name "*.map" -delete

FROM node:22-alpine

RUN apk add --no-cache openssl wget python3 py3-pip && \
    pip3 install --break-system-packages edge-tts

RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 --fetch-timeout=600000 && npx prisma generate && \
    chown -R appuser:appgroup node_modules/.prisma && \
    npm cache clean --force && rm -rf /root/.npm

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY start.sh ./start.sh
RUN chmod +x start.sh

RUN mkdir -p uploads logs && chown -R appuser:appgroup uploads logs

ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=768"
EXPOSE 3000

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:${PORT:-3000}/health || exit 1

CMD ["./start.sh"]
