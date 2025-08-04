# Multi-stage build for React + Node.js
FROM node:18-alpine AS frontend-build

# Set working directory for frontend
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies with memory optimization
RUN npm ci --cache .npm --prefer-offline --no-audit --omit=dev

# Copy frontend source code
COPY frontend/ ./

# Build the React app with memory limit
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

# Backend stage
FROM node:18-alpine AS backend

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies with memory optimization
RUN npm ci --cache .npm --prefer-offline --no-audit --omit=dev

# Copy backend source code
COPY backend/ ./

# Copy built frontend from previous stage
COPY --from=frontend-build /app/frontend/build ./public

# Set memory limits for Node.js
ENV NODE_OPTIONS="--max-old-space-size=512"

# Expose port
EXPOSE 3001

# Start the backend server
CMD ["npm", "start"]