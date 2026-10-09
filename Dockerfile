# Production Dockerfile for Next.js with Prisma & PostgreSQL
FROM node:20-alpine AS base

# Install OpenSSL for Prisma
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Dependencies Stage
COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Build Stage
COPY . .
RUN npm run build

# Production Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

# Start: aplica migrations (scripts/start.sh) e sobe o Next.js
CMD ["npm", "start"]
