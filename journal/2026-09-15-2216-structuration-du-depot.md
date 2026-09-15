---
date: 2026-09-15 22:16
objectif: Structurer le dépôt du dashboard — branches, décisions, cadrage, tranches, règles, GitHub — sans code applicatif.
tranches: [1, 2, 3, 4, 5, 6, 7, 8]
issues: [1, 2, 3, 4, 5, 6, 7, 8]
---

# Session du 2026-09-15 — structuration du dépôt

## Objectif

Structurer le dépôt cairn-dashboard, vide de tout commit, sans aucun code applicatif : branches et
protection sur le modèle de cairn-wms, cadre des décisions et fiche actée de la pile, cadrage,
`status.yml` en huit tranches, journal, règles de travail, labels et issues GitHub. En cours de
séance, l'objectif s'est étendu à la logique de déploiement et à deux fiches actées qui en
découlent : l'hébergement et l'environnement unique.

## Actions

- Constaté l'état de départ : dépôt local sans commit, dépôt GitHub public vide et sans branche.
- Relu cairn-wms pour en reprendre les formats, en comparant sa copie locale à sa version GitHub.
  La copie locale portait alors, non committé, le nouveau format du journal
  (`AAAA-MM-JJ-HHMM-sujet.md`, en-tête YAML) ; c'est ce format qui a été repris. Relevé aussi la
  protection réelle de `main` sur GitHub : résolution des conversations et invalidation des
  approbations périmées, en plus de ce que décrit son journal.
- Présenté un plan, validé après trois arbitrages (voir Décisions).
- Créé le commit d'amorce sur `main` (`README.md`, `.gitignore`, `.gitattributes`) et poussé.
- Créé `dev` depuis `main`, poussée et définie comme branche par défaut.
- Protégé `main`. La réponse de l'appel s'est perdue, `jq` n'étant pas installé : la protection a
  été relue ensuite, et elle est conforme.
- Cherché `docs/deploiement.md` à la racine du dépôt, où il était annoncé : absent. Il avait été
  versé dans cairn-wms par une autre session (`3d4ae2b`, avec deux fiches) ; Lucas a signalé une
  erreur de destination, et ce commit a depuis été annulé dans cairn-wms (`8a10a9c`). Rien n'en a
  été repris : le document vient de l'original fourni (`Desktop/Cairn/Docs/Claude outputs/`), et
  le diff avec cet original ne montre que les deux renvois ajoutés sous les sections 4 et 5.
- Rédigé les fiches `0001` à `0003`, le cadrage, le README et le modèle des décisions, le README du
  journal et `CLAUDE.md`. Vérifié que tous les liens relatifs aboutissent.
- Créé six commits sur `dev` et poussé.
- Sur GitHub : retiré les neuf labels par défaut (dont `accessibility`), conservé `bug`, créé
  `tech` et huit labels de tranche ; créé les issues `#1` à `#8` dans l'ordre des tranches, sans
  jalon. Numéros vérifiés : chaque issue porte le numéro de sa tranche.
- Écrit `status.yml` avec ces numéros, puis cette entrée.

## Décisions

Trois fiches actées, validées en séance :

- **[`0001` — Pile du dashboard](../docs/decisions/0001-pile-du-dashboard.md).** Une application
  Nuxt unique, en TypeScript de bout en bout : Nitro, SQLite pour la seule donnée propre, Octokit,
  SDK MCP officiel, connexion GitHub restreinte, OAuth pour le connecteur. Le serveur Python est
  écarté, parce qu'il ferait deux applications et que les outils officiels sont plus aboutis en
  TypeScript. Next.js est écarté parce que l'application est d'abord un serveur : Nitro offre le
  WebSocket natif et un modèle sans composants serveur ni cache implicite. L'écosystème plus large
  de Next.js est jugé non décisif.
- **[`0002` — Hébergement sur Coolify](../docs/decisions/0002-hebergement-sur-coolify.md).**
  Coolify est déjà en place, couvre les besoins, et son API de déploiement a déjà servi ; les
  alternatives n'apportent rien de décisif.
- **[`0003` — Dashboard : un seul environnement, production](../docs/decisions/0003-dashboard-un-seul-environnement.md).**
  La pull request vers `main`, protégée sans exception, tient lieu de validation. L'alternative
  `staging` + `production` est écartée.

Arbitrages non engageants, validés en séance :

- États de `status.yml` : `à faire`, `en développement`, `livré`. Pas de `spécifié`, aucune tranche
  n'ayant de spécification propre.
- Tranche 8 : le dashboard déclenche le déploiement d'un SHA vers un environnement **et** en suit
  l'état jusqu'à `/version` puis `/health`.
- La limite `docs/` vaut pour le connecteur MCP. L'interface crée des issues et déclenche des
  workflows, et ces deux écritures sont listées au cadrage.
- Le schéma SQLite passera par une fiche `proposée` au démarrage de la tranche 5.

Choix faits en rédigeant, sans validation explicite, à relire :

- Protection de `main` alignée sur la protection réelle de cairn-wms, un peu au-delà de la
  demande : résolution des conversations exigée, approbations périmées invalidées.
- En-tête du journal : le champ `modules` devient `tranches`.
- Modèle de fiche : la « contrainte de compétence » est retirée des contraintes à citer, puisque
  les compétences ne sont jamais un critère.
- Tranche 1 : `/health` ne vérifie que le jeton GitHub ; le contrôle de SQLite et le volume
  persistant arrivent avec la tranche 5, qui introduit la base (fiches `0002` et `0003`, issues
  `#1` et `#5`).
- Issue `#2` : la documentation de cairn-wms se lit sur sa branche `dev`, là où elle s'écrit.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `README.md` | Créé sur `main`. Présente le dashboard, sa structure, sa mise en service et ses branches. |
| `.gitignore` | Créé. Reprend celui de cairn-wms, plus Node, Nuxt et Nitro, SQLite. |
| `.gitattributes` | Créé. Fins de ligne LF, images, polices et bases SQLite déclarées binaires. |
| `docs/decisions/README.md` | Créé depuis celui de cairn-wms : table des fiches actées, schéma SQLite et extensions du cadrage ajoutés à ce qui mérite une fiche, portée limitée au dashboard. |
| `docs/decisions/modele.md` | Créé depuis celui de cairn-wms : renvoi au cadrage et aux tranches, sans règles métier ni compétence. |
| `docs/decisions/0001-pile-du-dashboard.md` | Créé. Pile du dashboard, actée. |
| `docs/decisions/0002-hebergement-sur-coolify.md` | Créé. Hébergement, acté, depuis la section 4 de `docs/deploiement.md`. |
| `docs/decisions/0003-dashboard-un-seul-environnement.md` | Créé. Environnement unique, acté, depuis la section 5 de `docs/deploiement.md`. |
| `docs/deploiement.md` | Repris de l'original fourni ; seuls deux renvois vers `0002` et `0003` ont été ajoutés. |
| `docs/cadrage.md` | Créé. Finalité, périmètre (lectures, réceptions, les trois écritures, ce qui est exposé), principes. |
| `status.yml` | Créé. Huit tranches `à faire`, chacune reliée à son issue et à son label. |
| `journal/README.md` | Créé depuis celui de cairn-wms, champ `tranches` à la place de `modules`. |
| `journal/2026-09-15-2216-structuration-du-depot.md` | Créé. La présente entrée. |
| `CLAUDE.md` | Créé depuis la version initiale de cairn-wms : règle 2 adaptée à la pile actée, règle 3 au nouveau format du journal, règle 6 ajoutée (livraison tranche par tranche). |

## Issues liées

- `#1` — ouverte. Aucun préalable bloquant : l'hébergement et l'environnement sont actés.
- `#2`, `#3`, `#4` — ouvertes.
- `#5` — ouverte. Préalable : fiche du schéma SQLite.
- `#6` — ouverte.
- `#7` — ouverte. Préalable à vérifier : la conservation des données OAuth.
- `#8` — ouverte. Bloquée par cairn-wms, qui n'a encore rien de ce que la tranche pilote.

Aucune n'est fermée : rien n'est réalisé.

## Points ouverts

- **Le modèle de déploiement n'a plus d'exemplaire dans cairn-wms.** `docs/deploiement.md` décrit
  un contrat commun à toutes les applications (section 3), et depuis l'annulation de `3d4ae2b` il ne
  vit plus qu'ici. Or la tranche 8 suppose que cairn-wms ait son `deploiement.yml`, ses
  environnements et ses routes `/version` et `/health`, et donc qu'il ait adopté ce contrat par
  ses propres décisions. Il faudra trancher comment cairn-wms s'y rattache.
- **L'hébergement de cairn-wms n'est acté nulle part.** La fiche `0002` n'engage que le dashboard,
  même si le serveur est commun.
- **Les données OAuth du connecteur (`#7`).** Si OAuth impose de conserver des clients ou des
  jetons, c'est une donnée propre que `0001` ne prévoit pas : il faudra une fiche avant de coder.
- **La tranche 1 est la plus lourde.** Le découpage vertical y fait entrer toute la chaîne
  d'intégration et de déploiement (`docs/deploiement.md` section 3), en plus du squelette.
- **Écart relevé dans cairn-wms, hors de ce dépôt.** Au moment de la relecture, la règle 3 de son
  `CLAUDE.md` citait encore des entrées de journal `AAAA-MM-JJ.md`, alors que son
  `journal/README.md` était passé à `AAAA-MM-JJ-HHMM-sujet.md`.
