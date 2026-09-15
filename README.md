# Cairn Dashboard

Site de suivi du projet [Cairn WMS](https://github.com/LucasLH1/cairn-wms), indépendant du WMS. Il
affiche la documentation, l'avancement, le journal et les issues de cairn-wms, un fil d'activité en
direct alimenté par les webhooks GitHub et les hooks Claude Code, et déclenche puis suit les
déploiements de cairn-wms. Il expose aussi un connecteur MCP distant, pour que Claude Chat et Cowork
puissent lire et alimenter la documentation de cairn-wms.

Le dashboard ne possède presque aucune donnée : **il lit et écrit dans GitHub**. cairn-wms reste la
source de vérité ; le dashboard n'en est qu'une interface.

Ce dépôt est **public**. À ce stade, il ne contient aucun code applicatif : la pile est actée dans
`docs/decisions/`, la réalisation commence avec la tranche 1a.

## Structure du dépôt

| Chemin | Contenu |
|---|---|
| `docs/cadrage.md` | Finalité, périmètre et principes du dashboard. |
| `docs/deploiement.md` | Logique d'intégration et de déploiement, indépendante de toute pile. |
| `docs/decisions/` | Les décisions engageantes, une fiche par décision. |
| `design/` | Le design de référence, exporté de Claude Design. Une référence visuelle, pas du code applicatif. |
| `journal/` | Une entrée par session de travail : ce qui a été fait, décidé, touché. |
| `status.yml` | L'état d'avancement de chaque tranche. |
| `CLAUDE.md` | Les règles de travail dans ce dépôt. |

## Avancement

Le dashboard se livre par tranches, l'une après l'autre, en découpage vertical : chacune est
utilisable de bout en bout, en ligne, avant que la suivante commence. Leur liste, leur ordre et leur
état se lisent dans `status.yml`.

## Mise en service

Adresse : **monitoring.cairn-wms.fr**. Un seul environnement, la production, hébergé sur Coolify.

## Branches

- `main` — production. Protégée : fusion par pull request uniquement.
- `dev` — branche de travail et branche par défaut.
