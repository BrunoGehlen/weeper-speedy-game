# ------------------
# Stage 1: Build
# ------------------
FROM node:18-alpine AS builder
WORKDIR /app

# Install deps
COPY package.json package-lock.json ./
RUN npm ci

# Copy source & build
COPY . .

# Dockerfile ── build stage
ARG PUBLIC_URL=.
ENV PUBLIC_URL=${PUBLIC_URL}

RUN npm run build

# ------------------
# Stage 2: Serve
# ------------------
FROM node:18-alpine
WORKDIR /app

# Install 'serve'
RUN npm install -g serve

# Copy only the build output
COPY --from=builder /app/build ./build

# Expose port 80
EXPOSE 80

# Serve with SPA fallback and CORS enabled
CMD ["serve", "-s", "build", "-l", "80", "--cors"]
