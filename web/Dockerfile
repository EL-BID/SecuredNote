# syntax=docker/dockerfile:1
ARG NODE_VERSION=20-bookworm-slim
FROM node:${NODE_VERSION} AS builder

ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 make g++ libsqlite3-dev \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable && corepack prepare pnpm@9.12.3 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --no-frozen-lockfile --prod=false

COPY app ./app
COPY components ./components
COPY lib ./lib
COPY locales ./locales
COPY styles ./styles
COPY public ./public
COPY next.config.mjs tsconfig.json postcss.config.mjs components.json ./
COPY instrumentation.ts ./instrumentation.ts

ARG NEXT_PUBLIC_API_BASE
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ARG NEXT_PUBLIC_GITHUB_REPO_URL
ARG NEXT_PUBLIC_BRAND_PRIMARY
ARG NEXT_PUBLIC_BRAND_ACCENT
ARG NEXT_PUBLIC_BRAND_BACKGROUND
ARG NEXT_PUBLIC_BRAND_APP_NAME
ARG HSTS_MAX_AGE_SECONDS
ARG HSTS_PRELOAD
ARG CSP_REPORT_BASE
ARG WEB_ORIGIN=http://localhost:3001
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID \
    NEXT_PUBLIC_GITHUB_REPO_URL=$NEXT_PUBLIC_GITHUB_REPO_URL \
    NEXT_PUBLIC_BRAND_PRIMARY=$NEXT_PUBLIC_BRAND_PRIMARY \
    NEXT_PUBLIC_BRAND_ACCENT=$NEXT_PUBLIC_BRAND_ACCENT \
    NEXT_PUBLIC_BRAND_BACKGROUND=$NEXT_PUBLIC_BRAND_BACKGROUND \
    NEXT_PUBLIC_BRAND_APP_NAME=$NEXT_PUBLIC_BRAND_APP_NAME \
    HSTS_MAX_AGE_SECONDS=$HSTS_MAX_AGE_SECONDS \
    HSTS_PRELOAD=$HSTS_PRELOAD \
    CSP_REPORT_BASE=$CSP_REPORT_BASE \
    WEB_ORIGIN=$WEB_ORIGIN

RUN touch .env && pnpm build && rm -f .env

FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001 \
    HOSTNAME=0.0.0.0 \
    HOST=0.0.0.0 \
    SQLITE_PATH=/data/secured-note.db \
    HSTS_MAX_AGE_SECONDS=31536000 \
    HSTS_PRELOAD=false \
    NEXT_PUBLIC_GA_MEASUREMENT_ID= \
    NEXT_PUBLIC_GITHUB_REPO_URL= \
    WEB_ORIGIN=http://localhost:3001

RUN apt-get update \
  && apt-get install -y --no-install-recommends dumb-init libsqlite3-0 \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /data \
  && chown -R nextjs:nodejs /data

COPY --chown=root:root --chmod=0555 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

COPY --from=builder --chown=root:root /app/next.config.mjs ./
COPY --from=builder --chown=root:root /app/public ./public
COPY --from=builder --chown=root:root /app/package.json ./package.json
COPY --from=builder --chown=root:root /app/.next/standalone ./
COPY --from=builder --chown=root:root /app/.next/static ./.next/static

USER nextjs:nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health',r=>(r.statusCode===200)?process.exit(0):process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
