# Multi-stage build for production
# Build for Render deployment
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy all source files (excluding files in .dockerignore)
COPY . .

# Install dependencies
RUN npm ci

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create data directory for SQLite
RUN mkdir -p /app/data

# Environment variables
ENV NODE_ENV=production
ENV PORT=4002
ENV DATABASE_FILE=/app/data/phase1.db

# Expose port
EXPOSE 4002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4002/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start the server
CMD ["node", "dist/api/server.js"]
