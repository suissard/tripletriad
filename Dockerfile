# Multi-stage Dockerfile for Triple Triad Frontend
# Stage 1: Build environment
FROM node:24-alpine AS builder

WORKDIR /opt/app

# Copy shared logic and frontend code
# Note: This Dockerfile expects to be run with the project root as context
COPY shared /opt/app/shared
COPY front /opt/app/front

# Set working directory to the frontend
WORKDIR /opt/app/front

# Install dependencies
# Using --frozen-lockfile is safer for reproducible builds, but since we're in a local env
# without a lockfile sometimes, we use standard npm install
RUN npm install

# Build environment variables (hardcoded in Vite build)
ARG VITE_STRAPI_URL
ENV VITE_STRAPI_URL=$VITE_STRAPI_URL
ARG APP_DOMAIN
ENV APP_DOMAIN=$APP_DOMAIN

# Build the frontend
RUN npm run build

# Stage 2: Production environment (Nginx)
FROM nginx:alpine

# Copy the built files from the builder stage
COPY --from=builder /opt/app/front/dist /usr/share/nginx/html

# Copy the Nginx configuration template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Metadata
EXPOSE 80
