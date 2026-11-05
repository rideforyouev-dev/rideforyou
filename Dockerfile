FROM node:24-bookworm-slim AS frontend
WORKDIR /build/client
COPY client/package.json client/package-lock.json ./
RUN npm ci --include=dev
COPY client/ ./
RUN npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
# Keep the transferred instance from duplicating reminders while the old host is live.
# Set PAUSE_AUTO_REMINDERS=false in Railway after the old instance is stopped.
ENV PAUSE_AUTO_REMINDERS=true
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY src/ ./src/
COPY public/ ./public/
COPY --from=frontend /build/client/dist ./client/dist
EXPOSE 5000
CMD ["node", "server.js"]
