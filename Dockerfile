# Image du dashboard — contrat de docs/deploiement.md §3 :
# le SHA est reçu en argument de construction (APP_COMMIT) et inscrit dans l'image,
# qui sert /version et /health.

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG APP_COMMIT=inconnu
ENV APP_COMMIT=$APP_COMMIT
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app

ARG APP_COMMIT=inconnu
ENV APP_COMMIT=$APP_COMMIT \
    NODE_ENV=production \
    NITRO_PORT=3000 \
    NITRO_HOST=0.0.0.0

COPY --from=build /app/.output ./.output

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
