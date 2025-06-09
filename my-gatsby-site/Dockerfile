# Multi-stage Dockerfile for Gatsby frontend
# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies for node-gyp and building native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Update browserslist database
RUN npx update-browserslist-db@latest

# Copy source code
COPY . .

# Build the Gatsby site with Docker-friendly settings
RUN GATSBY_CPU_COUNT=1 NODE_OPTIONS="--max-old-space-size=4096" npm run build -- --verbose

# Production stage
FROM nginx:alpine AS runtime

# Set environment variables
ENV NGINX_USER=nginx
ENV NGINX_PID_FILE=/var/run/nginx.pid

# Install curl for health checks
RUN apk add --no-cache curl

# Create nginx user and group if they don't exist
RUN addgroup -S nginx 2>/dev/null || true && \
    adduser -S nginx -G nginx 2>/dev/null || true

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/public /usr/share/nginx/html

# Create directories for nginx
RUN mkdir -p /var/cache/nginx /var/log/nginx && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 