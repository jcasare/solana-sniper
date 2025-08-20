# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY dashboard/package*.json ./dashboard/

# Install dependencies
RUN npm ci
RUN cd dashboard && npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build
RUN cd dashboard && npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install PM2 globally
RUN npm install -g pm2

# Copy package files
COPY package*.json ./
COPY dashboard/package*.json ./dashboard/

# Install production dependencies only
RUN npm ci --only=production
RUN cd dashboard && npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dashboard/.next ./dashboard/.next
COPY --from=builder /app/dashboard/public ./dashboard/public

# Copy configuration files
COPY nest-cli.json tsconfig.json ./
COPY dashboard/next.config.js ./dashboard/

# Create logs directory
RUN mkdir -p logs

# Expose ports
EXPOSE 3000 3001

# Start both services using PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]