FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production || npm install --only=production

COPY . .

ENV PORT=8080
EXPOSE 8080

CMD ["node", "services/price-tracking-coordinator.js"]
