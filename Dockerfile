# Sec. 2–3: aceeași imagine pe server, pe laptop (rezerva offline) și on-prem.
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM base AS migrator
WORKDIR /migrator
COPY docker/migrator/package.json ./
RUN npm install --omit=dev --no-audit --no-fund

FROM base AS runtime
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN useradd --system --uid 1001 app && mkdir -p /data/files && chown app /data/files
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/src/db/migrations ./src/db/migrations
COPY --from=build /app/seed ./seed
COPY --from=migrator /migrator/node_modules ./migrator/node_modules
COPY docker/migrator/migrate.mjs docker/migrator/package.json ./migrator/
USER app
EXPOSE 3000
CMD ["node", "server.js"]
