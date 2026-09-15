# Cadrage

Ce document dit à quoi sert le dashboard, ce qu'il couvre et les principes qu'il respecte. Les
choix techniques sont dans `docs/decisions/` ; le découpage en tranches et leur état, dans
`status.yml`.

## Finalité

Suivre le projet [Cairn WMS](https://github.com/LucasLH1/cairn-wms) depuis un seul endroit : sa
documentation, son avancement, son journal, ses issues, son activité en direct et ses déploiements.
Et permettre à Claude Chat et à Cowork, par un connecteur MCP distant, de lire cette documentation
et de l'alimenter.

Le dashboard est **indépendant du WMS** : il n'en fait pas partie et ne partage pas sa pile. Il ne
connaît de cairn-wms que ce qu'expose son dépôt GitHub et, pour les déploiements, ses routes
`/version` et `/health`. Il ne possède presque aucune donnée : il lit et écrit dans GitHub.

## Périmètre

### Ce qu'il lit

Dans le dépôt cairn-wms, par l'API GitHub :

| Lecture | Tranche |
|---|---|
| La documentation, `docs/`, décisions comprises | 2 |
| L'avancement, à partir de `status.yml` | 3 |
| Les issues | 4 |
| Le journal, `journal/` | 5 |
| L'état des déploiements, jusqu'à la vérification de `/version` puis `/health` | 8 |

### Ce qu'il reçoit

| Source | Destination | Tranche |
|---|---|---|
| Webhooks GitHub de cairn-wms | Fil d'activité en direct | 5 |
| Hooks Claude Code | Le même fil d'activité | 6 |

Ces événements forment l'historique conservé dans SQLite : **la seule donnée propre du dashboard**
([`0001`](decisions/0001-pile-du-dashboard.md)).

### Ce qu'il écrit

Toute écriture va dans cairn-wms, sur GitHub. Il y en a trois, et aucune autre :

| Écriture | Faite par | Cible | Tranche |
|---|---|---|---|
| Créer des issues | L'interface | Issues de cairn-wms | 4 |
| Déclencher des workflows — à ce jour `deploiement.yml`, pour déployer un SHA vers un environnement | L'interface | GitHub Actions de cairn-wms | 8 |
| Alimenter la documentation | Le connecteur MCP | `docs/` de cairn-wms, branche `dev` | 7 |

Ajouter une écriture à cette liste, ou en élargir une, est une décision engageante : elle passe par
une fiche.

### Ce qu'il expose

- Une **interface web**, à monitoring.cairn-wms.fr, réservée au compte GitHub `LucasLH1`.
- Un **connecteur MCP distant**, protégé par OAuth, pour Claude Chat et Cowork.
- Les points d'entrée des **webhooks GitHub** et des **hooks Claude Code**, authentifiés par leur
  secret.
- Les routes **`/version` et `/health`**, publiques par contrat ([`docs/deploiement.md`](deploiement.md) §2).

### Hors périmètre

- Les données d'exploitation de Cairn WMS : le dashboard suit le projet, pas l'entrepôt.
- Toute écriture dans cairn-wms autre que les trois listées ci-dessus.
- Les choix de cairn-wms — pile, hébergement, environnements : le dashboard pilote ce que cairn-wms
  expose, il ne le décide pas.

## Principes

### 1. cairn-wms est la source de vérité

Le dashboard n'en est qu'une interface. Ce qu'il affiche vient de cairn-wms ; ce qu'il modifie est
modifié dans cairn-wms. En cas de divergence, cairn-wms a raison.

Il lit les formats de cairn-wms tels qu'ils sont — `status.yml`, en-têtes du journal, labels — et
s'adapte quand ils changent. Il ne les redéfinit pas.

### 2. Le connecteur MCP n'écrit que dans `docs/` de cairn-wms

Ses écritures sont limitées, toutes les trois à la fois :

- au dossier `docs/` de cairn-wms, et à rien d'autre ;
- à la branche `dev` — jamais `main`, jamais une autre branche ;
- à des commits dont le message commence par `docs:`.

La limite est vérifiée par le serveur, à chaque écriture : une demande qui en sort est refusée,
quelle que soit la formulation reçue de l'assistant.

Cette limite vaut pour le connecteur MCP. Les écritures de l'interface — créer des issues,
déclencher des workflows — n'en relèvent pas : elles sont listées au périmètre, et bornées à cette
liste.

### 3. Aucun secret dans le dépôt

Le dépôt est public. Le jeton GitHub, les secrets OAuth — connexion à l'interface et connecteur
MCP — et les secrets des hooks — webhooks GitHub, hooks Claude Code — vivent **uniquement en
variables d'environnement**. Seul un modèle sans valeur réelle, `.env.example`, peut être suivi.

Les secrets de déploiement suivent la même règle, dans les environnements GitHub et dans Coolify
([`docs/deploiement.md`](deploiement.md) §2, principe 10).

### 4. Rien d'accessible sans authentification

À l'exception de `/version` et `/health`, rien de ce que le dashboard montre ou permet n'est
accessible sans authentification : l'interface exige une connexion GitHub au compte `LucasLH1`, le
connecteur une autorisation OAuth, les webhooks et les hooks leur secret.

### 5. Une tranche à la fois, en découpage vertical

Le dashboard se construit par tranches, livrées dans l'ordre de `status.yml`. Chacune traverse
toutes les couches — interface, serveur, GitHub, données, mise en service — et est utilisable de
bout en bout, en production, avant que la suivante commence.
