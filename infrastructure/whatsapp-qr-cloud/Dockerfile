FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY index.js ./

# Create dirs for auth and messages
RUN mkdir -p whatsapp_auth whatsapp_messages

# Expose port
EXPOSE 9377

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:9377/whatsapp/status || exit 1

# Run
CMD ["node", "index.js"]
