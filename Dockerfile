# Rallyboard production image.
# Build:  docker build -t rallyboard .
# Most people should use docker-compose.yml instead, which also runs Postgres.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Migrations run on every start, so the image carries them and their dependencies.
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=builder /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder /app/node_modules/postgres ./node_modules/postgres

# Uploaded logos live here; mount a volume to keep them across upgrades.
RUN mkdir -p /app/data/uploads && chown -R node:node /app/data
USER node
VOLUME ["/app/data"]
EXPOSE 3000

CMD ["sh", "-c", "node scripts/migrate.mjs && node server.js"]
