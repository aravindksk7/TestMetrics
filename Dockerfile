# ── Stage 1: Build React client ──────────────────────────────
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package.json ./
RUN npm install
COPY client/ .
RUN npm run build

# ── Stage 2: Production server ────────────────────────────────
FROM node:22-alpine AS server
WORKDIR /app
COPY server/package.json ./server/
RUN cd server && npm install --omit=dev
# Make server node_modules visible to seed scripts under database/
RUN ln -s /app/server/node_modules /app/node_modules
COPY server/ ./server/
COPY database/ ./database/
COPY *.xlsx ./
COPY --from=client-build /app/client/dist ./client/dist

ENV NODE_ENV=production
EXPOSE 3500
CMD ["node", "server/server.js"]
