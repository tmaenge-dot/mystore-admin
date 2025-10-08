FROM node:20-slim

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . ./

EXPOSE 5000

# Use server.js as the canonical start point
CMD ["node", "server.js"]
FROM node:20-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --production --no-audit --no-fund

COPY . .

EXPOSE 5000
CMD ["node", "server.js"]
