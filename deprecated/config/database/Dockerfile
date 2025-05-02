# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install required system packages including PostgreSQL client and Redis client
RUN apk add --no-cache \
    postgresql-client \
    tzdata \
    bash \
    curl \
    ffmpeg \
    python3 \
    g++ \
    make \
    libc6-compat

# Set environment variables
ENV NODE_ENV=production \
    TZ=UTC

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create directories for data
RUN mkdir -p /app/data /app/recordings /app/backups /app/logs

# Set permissions
RUN chmod -R 755 /app

# Expose application port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Command to run when container starts
CMD ["node", "server/index.js"]