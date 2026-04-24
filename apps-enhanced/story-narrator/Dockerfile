FROM node:18-slim

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci --only=production || npm install --only=production

# Copy source
COPY . .

ENV PORT=8080
EXPOSE 8080

# Set Node to use CommonJS (default for .js files without type: module)
CMD ["node", "index.js"]
