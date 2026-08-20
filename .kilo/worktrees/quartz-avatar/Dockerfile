# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install native dependencies for sharp (image processing)
RUN apk add --no-cache vips-dev

# Install all dependencies (including devDependencies for TypeScript)
COPY package*.json ./
RUN npm ci

# Copy source code and Prisma schema
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build frontend (output goes to dist/client)
RUN npx vite build

# Compile server TypeScript (output goes to dist/server)
RUN npx tsc -p tsconfig.server.json

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies for sharp
RUN apk add --no-cache vips

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy compiled server code
COPY --from=builder /app/dist/server ./dist/server

# Copy frontend build output
COPY --from=builder /app/dist/client ./dist/client

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start server (use db push since no migration files exist)
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/server/index.js"]
