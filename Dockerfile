# Stage 1: Build the Vue application
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy project files and build
COPY . .
RUN npm run build

# Stage 2: Serve with Caddy
FROM caddy:2-alpine

# Copy built static files from the build stage
COPY --from=build /app/dist /usr/share/caddy

# Copy custom Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# Expose standard web ports
EXPOSE 80
EXPOSE 443
