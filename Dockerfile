# ---- build the React frontend ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime: Express serves the API and the built frontend ----
FROM node:22-alpine
ENV NODE_ENV=production PORT=5001 DATA_DIR=/data TRUST_PROXY=true
WORKDIR /app
COPY backend/package*.json ./backend/
RUN npm --prefix backend ci --omit=dev
COPY backend ./backend
COPY --from=build /app/dist ./dist
VOLUME /data
EXPOSE 5001
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:5001/api/health || exit 1
CMD ["node", "backend/server.js"]
