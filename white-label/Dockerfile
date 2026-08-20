FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --no-audit --no-fund && npx prisma generate

COPY . .

RUN npm run build

FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl wget

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev --no-audit --no-fund && npx prisma generate

COPY --from=builder /app/dist ./dist
COPY server ./server

ENV NODE_ENV=production
ENV PORT=4001
EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4001/api/health || exit 1

CMD ["node", "server/index.cjs"]
