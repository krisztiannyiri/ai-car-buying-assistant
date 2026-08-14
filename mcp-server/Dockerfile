FROM node:20-alpine
WORKDIR /app

# tsx and typescript live in devDependencies and are needed at runtime,
# so install the full dependency set rather than --omit=dev.
COPY package*.json ./
RUN npm ci

COPY lib/ ./lib/
COPY mcp-server/ ./mcp-server/
COPY tsconfig.json ./

RUN chown -R node:node /app
USER node

EXPOSE 3001
CMD ["./node_modules/.bin/tsx", "mcp-server/index.ts"]
