# Simple backend-only build
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy backend source code
COPY backend/ ./

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Start the backend server
CMD ["npm", "start"]