# Base image for setting up the environment
FROM node:18-alpine AS base

# Setup dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies using npm
COPY package.json package-lock.json ./
RUN npm install

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prepare production image
FROM base AS runner
WORKDIR /app

# Set environment variables for production
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Add a non-root user for security
RUN addgroup --system --gid 1001 fastify
RUN adduser --system --uid 1001 fastifyuser

# Copy application files to production stage
COPY --from=builder /app /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Set user for running the application
USER fastifyuser

# Expose port 3000
EXPOSE 3000

# Set application port
ENV PORT 3000

# Start the application
CMD ["npm", "start"]
