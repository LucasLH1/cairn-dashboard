# Image du dashboard — contrat de docs/deploiement.md §3 :
# le SHA est reçu en argument de construction (APP_COMMIT) et inscrit dans l'image,
# qui sert /version et /health.

# Version épinglée : conséquence de la fiche 0006. `node:sqlite` est expérimental
# sous Node 22, donc son API peut changer dans une version mineure. Une étiquette
# mouvante ferait basculer la base du dashboard sans que personne ne l'ait décidé.
FROM node:22.23.2-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG APP_COMMIT=inconnu
ENV APP_COMMIT=$APP_COMMIT
RUN npm run build

FROM node:22.23.2-alpine AS run
WORKDIR /app

ARG APP_COMMIT=inconnu
ENV APP_COMMIT=$APP_COMMIT \
    NODE_ENV=production \
    NITRO_PORT=3000 \
    NITRO_HOST=0.0.0.0

COPY --from=build /app/.output ./.output

USER node
EXPOSE 3000

# Le contrôle de santé du conteneur vise /live, qui ne dépend de rien d'extérieur.
# Surtout pas /health : depuis la tranche 3, celui-ci éprouve une lecture réelle
# chez GitHub et passe à 503 si GitHub est indisponible. Le conteneur, lui, va
# bien — une panne GitHub ne doit pas devenir une panne d'hébergement.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/live').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
