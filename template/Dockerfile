# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy only the compiled files from builder
COPY --from=builder /app/dist ./dist

# Copy package.json for any runtime dependencies
COPY --from=builder /app/package.json ./

# Install only production dependencies if needed
RUN bun install --production --frozen-lockfile || true

# Expose port (adjust as needed)
EXPOSE 3000

ENV NODE_ENV=production

# Run the application
CMD ["bun", "run", "dist/server/server.js"]