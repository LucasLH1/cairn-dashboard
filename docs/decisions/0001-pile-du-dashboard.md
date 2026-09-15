# 0001 — Pile du dashboard

**Statut** : actée · **Date** : 2026-09-15 · **Remplace** : — · **Remplacée par** : —

## Contexte

Le dashboard est le site de suivi de Cairn WMS décrit dans [`docs/cadrage.md`](../cadrage.md). Il
ne possède presque aucune donnée : il lit et écrit dans GitHub. Ce qu'il doit faire en fait
**d'abord un serveur**, et ensuite une interface :

- recevoir les webhooks GitHub de cairn-wms et les événements des hooks Claude Code ;
- diffuser un fil d'activité en direct vers le navigateur ;
- relayer l'API GitHub : lire la documentation, `status.yml`, le journal et les issues de
  cairn-wms, créer des issues, déclencher des workflows ;
- exposer un connecteur MCP distant, protégé par OAuth, pour Claude Chat et Cowork ;
- présenter le tout dans une interface web réservée à un seul compte GitHub.

Sa seule donnée propre est l'historique des événements du fil en direct. Il est auto-hébergé sur un
VPS.

Aucune pile n'est en place : le dépôt ne contient aucun code. Le choix ne concerne que le
dashboard ; la pile de cairn-wms, elle, reste à décider dans son propre dépôt.

## Options

### Option A — Nuxt, en TypeScript

- **Ce que c'est** : un framework Vue pour l'interface, dont le serveur intégré, Nitro, porte les
  webhooks, le fil en direct, le relais GitHub et le connecteur MCP. Une seule application,
  TypeScript de bout en bout.
- **En faveur** :
  - Nitro est un serveur autonome, conçu pour ce que l'application fait d'abord : recevoir,
    diffuser, relayer ;
  - WebSocket natif dans Nitro ;
  - un modèle simple : ni composants serveur React, ni cache implicite ;
  - auto-hébergement direct, en un seul serveur Node ;
  - accès aux outils officiels : Octokit pour GitHub, SDK MCP officiel TypeScript ; `mcp-handler`
    prend en charge Nuxt.
- **En défaveur** : un écosystème moins large que celui de Next.js.
- **Ce que ça ferme** : les bibliothèques d'interface propres à React.

### Option B — Next.js, en TypeScript

- **Ce que c'est** : un framework React dont les routes serveur portent la partie serveur. Une
  seule application, TypeScript de bout en bout.
- **En faveur** :
  - l'écosystème le plus large ;
  - les mêmes outils officiels : Octokit, SDK MCP officiel TypeScript ; `mcp-handler` prend en
    charge Next.js.
- **En défaveur** :
  - pas de WebSocket dans les routes Next.js sans serveur personnalisé ;
  - un modèle plus chargé : composants serveur React et cache implicite à maîtriser ;
  - le serveur y est au service de l'interface, alors qu'ici l'application est d'abord un serveur.
- **Ce que ça ferme** : le WebSocket dans le modèle standard ; y revenir impose un serveur
  personnalisé.

### Option C — Serveur Python et interface séparée

- **Ce que c'est** : un serveur Python (FastAPI, SDK MCP Python) pour les webhooks, le fil en direct
  et le connecteur, et une interface JavaScript construite à part.
- **En faveur** : un serveur autonome, WebSocket compris, sans contrainte de framework d'interface.
- **En défaveur** :
  - deux langages et deux applications à construire, déployer et tenir ;
  - Octokit, le SDK maintenu par GitHub, n'existe pas en Python ;
  - les outils officiels MCP et GitHub les plus aboutis sont en TypeScript.
- **Ce que ça ferme** : le partage des types entre le serveur et l'interface.

## Décision

**Le dashboard est une application Nuxt unique, écrite en TypeScript de bout en bout.**

| Besoin | Choix |
|---|---|
| Langage | TypeScript, serveur et interface |
| Interface | Vue, par Nuxt |
| Webhooks, fil en direct, relais GitHub, connecteur MCP | Nitro, le serveur intégré de Nuxt |
| Historique des événements, seule donnée propre | SQLite |
| Accès à GitHub | Octokit |
| Connecteur MCP | SDK MCP officiel TypeScript |
| Accès à l'interface | Connexion GitHub, restreinte au compte `LucasLH1` |
| Accès au connecteur MCP | OAuth |

Deux critères écartent l'option C : les outils officiels MCP et GitHub les plus aboutis sont en
TypeScript, et une seule application déployée vaut mieux que deux.

Entre Nuxt et Next.js, qui satisfont tous deux ces critères, le critère décisif est la nature de
l'application : **c'est d'abord un serveur**. Nitro est un serveur autonome conçu pour cet usage ; il
offre le WebSocket nativement, ce que les routes Next.js ne permettent pas sans serveur
personnalisé ; il n'impose ni composants serveur ni cache implicite ; il s'auto-héberge directement
en un seul serveur Node. Sur MCP, les deux se valent : `mcp-handler` couvre l'un et l'autre.
L'avantage de Next.js, un écosystème plus large, est jugé non décisif.

Décision validée en séance le 2026-09-15. Elle n'engage en rien la pile de cairn-wms.

## Conséquences

- **Ce qu'on peut faire** : livrer chaque tranche dans une seule application, de l'écran jusqu'à
  l'API GitHub ; partager les types entre le serveur et l'interface ; tenir le fil en direct par
  WebSocket, sans service annexe.
- **Ce qu'on ne peut plus faire** : ajouter une seconde application, un second langage ou une autre
  base que SQLite sans nouvelle fiche ; confier à SQLite une autre donnée que l'historique des
  événements sans nouvelle fiche.
- **Ce qu'il faut mettre en place** :
  - le contrat commun de [`docs/deploiement.md`](../deploiement.md) §3 — `Dockerfile`, routes
    `/version` et `/health`, `compose.yaml`, scripts `scripts/ci/*` — dès la tranche 1 ;
  - le schéma SQLite de l'historique des événements, par une fiche proposée au démarrage de la
    tranche 5 ;
  - les secrets en variables d'environnement uniquement : jeton GitHub, secrets OAuth, secrets des
    hooks (voir le cadrage).
- **Ce qu'on accepte de payer** : un écosystème moins large que celui de React ; une dépendance
  à Nitro pour toute la partie serveur ; avec SQLite, une seule instance de l'application à la fois.
- **Ce qui la remettrait en cause** : le besoin de faire tourner plusieurs instances ; la perte du
  WebSocket natif dans Nitro ; un besoin du connecteur MCP que le SDK officiel TypeScript ne
  couvrirait pas.
