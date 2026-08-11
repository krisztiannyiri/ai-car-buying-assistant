FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY lib/ ./lib/
COPY mcp-server/ ./mcp-server/
COPY tsconfig.json ./
RUN npm install -D tsx typescript
CMD ["npx", "tsx", "mcp-server/index.ts"]
