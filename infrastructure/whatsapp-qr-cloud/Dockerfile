FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY index.js ./
COPY gcs_auth_state.js ./

# Create dirs for auth and messages
RUN mkdir -p whatsapp_auth whatsapp_messages

# Expose port - use PORT env var (Cloud Run sets this)
ENV PORT=8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-8080}/whatsapp/status || exit 1

# Run - use PORT env var
CMD ["node", "index.js"]
