# Cairn Dashboard

Site de suivi du projet [Cairn WMS](https://github.com/LucasLH1/cairn-wms), indépendant du WMS. Il
affiche la documentation, l'avancement, le journal et les issues de cairn-wms, un fil d'activité en
direct alimenté par les webhooks GitHub et les hooks Claude Code, et déclenche puis suit les
déploiements de cairn-wms. Il expose aussi un connecteur MCP distant, pour que Claude Chat et Cowork
puissent lire et alimenter la documentation de cairn-wms.

Le dashboard ne possède presque aucune donnée : **il lit et écrit dans GitHub**. cairn-wms reste la
source de vérité ; le dashboard n'en est qu'une interface.

Ce dépôt est **public** : aucune valeur sensible n'y figure. Les secrets vivent en variables
d'environnement.

## Structure du dépôt

| Chemin | Contenu |
|---|---|
| `app/` | L'interface : pages, mise en page, composants, thème. |
| `server/` | Le serveur : routes `/version` et `/health`, utilitaires. |
| `public/` | Fichiers servis tels quels : polices du design, favicon. |
| `scripts/ci/` | `lint`, `test`, `smoke` — noms fixes appelés par les workflows. |
| `.github/workflows/` | `qualite.yml`, `image.yml`, `deploiement.yml`. |
| `docs/cadrage.md` | Finalité, périmètre et principes du dashboard. |
| `docs/deploiement.md` | Logique d'intégration et de déploiement. |
| `docs/decisions/` | Les décisions engageantes, une fiche par décision. |
| `design/` | Le design de référence, exporté de Claude Design. |
| `journal/` | Une entrée par session de travail. |
| `status.yml` | L'état d'avancement de chaque tranche. |
| `CLAUDE.md` | Les règles de travail dans ce dépôt. |

## Mise en route

```sh
npm install
cp .env.example .env   # puis renseigner les valeurs, le fichier n'est pas suivi
npm run dev            # http://localhost:3000
```

Contrôles, identiques à ceux de l'intégration :

```sh
scripts/ci/lint        # eslint et typage
scripts/ci/test        # tests unitaires
docker compose build   # image, avec APP_COMMIT
scripts/ci/smoke cairn-dashboard:local "$(git rev-parse HEAD)"
```

## Contrat de service

| Route | Réponse |
|---|---|
| `/version` | `{"commit": "<sha>"}` — le SHA inscrit dans l'image à sa construction. |
| `/health` | `200` si les dépendances répondent, `503` sinon. |

## Avancement

Le dashboard se livre par tranches, l'une après l'autre, en découpage vertical : chacune est
utilisable de bout en bout, en ligne, avant que la suivante commence. Leur liste, leur ordre et leur
état se lisent dans `status.yml`.

## Mise en service

Adresse : **monitoring.cairn-wms.fr**. Un seul environnement, la production, hébergé sur Coolify.
L'image est construite et éprouvée sur `dev`, puis déployée à la fusion de la pull request vers
`main`, sans être reconstruite.

## Branches

- `main` — production. Protégée : fusion par pull request uniquement.
- `dev` — branche de travail et branche par défaut.
