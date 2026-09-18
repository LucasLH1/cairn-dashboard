# 0010 — Développement local sur données fictives

**Statut** : actée · **Date** : 2026-09-18 · **Remplace** : — · **Remplacée par** : —

## Contexte

Le dashboard n'a qu'un environnement, la production ([`0003`](0003-dashboard-un-seul-environnement.md)).
Aujourd'hui, pour voir un changement à l'écran, il faut ouvrir la pull request `dev` → `main` et la
fusionner, ce qui le met en service. La refonte du design qui s'annonce consiste en une suite de
petites modifications de l'interface, à voir aussitôt faites : passer à chaque fois par la production
coûterait plus de temps que la modification elle-même.

`npm run dev` existe et démarre (README, « Mise en route »), mais il ne rend rien d'utilisable sur le
poste. Relevé le 2026-09-18 : le `.env` du poste ne porte que `NUXT_GITHUB_REPO`, `/health` répond
503 (`github: non-configure`, `connexion: secret-de-session-absent`) et toute page mène à
`/connexion`. Pour aller plus loin, il faudrait une seconde OAuth App (une OAuth App n'accepte qu'une
URL de rappel), un jeton GitHub, et l'on travaillerait alors sur le vrai cairn-wms.

**Le besoin exprimé** : les vraies données n'importent pas, des données de test suffisent. Ce qui
compte, c'est la rapidité avec laquelle on voit l'interface changer.

Plusieurs contraintes pèsent sur le choix :

- **principe 4 du cadrage** : rien n'est accessible sans authentification. En production, cela doit
  rester vrai sans exception, même si l'outillage local est mal configuré ;
- **principe 1** : il n'existe qu'un seul cairn-wms. Une instance locale munie d'un jeton qui a le
  droit d'écrire créerait de **vrais tickets**, et plus tard de vrais commits (tranche 7) et de vrais
  déploiements (tranche 8) ;
- **règle 1** de [`CLAUDE.md`](../../CLAUDE.md) : les formats de cairn-wms se lisent tels qu'ils sont
  à la source. Des données fictives en reprennent la forme, sinon l'interface serait conçue pour un
  format qui n'existe pas.

### Ce que le serveur demande à GitHub, relevé dans le code le 2026-09-18

La liste est courte et close :

| Appel | Où |
|---|---|
| `GET /repos/{dépôt}/git/trees/{branche}?recursive=1` | `doc-github.ts` |
| `GET /repos/{dépôt}/contents/{chemin}?ref=…` | `doc-github.ts` (documentation, `status.yml`, journal) |
| `GET /repos/{dépôt}/issues`, `/labels`, `/milestones` | `tickets-github.ts` |
| `POST /repos/{dépôt}/issues` | `tickets-github.ts` (seule écriture) |
| `GET /repos/{dépôt}` | `sante-github.ts` (`/health`) |
| `github.com/login/oauth/authorize`, `…/access_token`, `GET /user` | `oauth-github.ts` (connexion) |

Toutes ces adresses sont aujourd'hui écrites en dur. Le fil en direct, lui, ne demande rien à
GitHub : il vient de la base SQLite, alimentée par les routes de réception.

### Deux faits de Nuxt, vérifiés dans le code source installé

1. **Une configuration placée sous `$development` n'est fusionnée que si `NODE_ENV` vaut
   `development`** (`c12`, `options.envName ?? process.env.NODE_ENV`). `nuxt dev` s'en sert, pas
   `nuxt build`.
2. **Une variable `NUXT_*` ne peut que remplacer une clé qui existe déjà dans la configuration
   d'exécution** (`nitropack`, `applyEnv` ne parcourt que les clés présentes). Elle ne peut pas en
   créer une.

Ensemble, ces deux faits permettent de déclarer une clé **qui n'existe pas dans l'image de
production**. Aucune variable d'environnement ne peut alors la faire exister après coup.

## Options

### Option A — Un faux GitHub local, adresses substituables en développement seulement

- **Ce que c'est** : un petit serveur Node, sans dépendance, qui répond aux appels du tableau
  ci-dessus à partir de données fictives rangées dans le dépôt. Les adresses de GitHub deviennent
  des clés de configuration déclarées **uniquement sous `$development`**. En production, elles
  n'existent pas et le code garde les adresses réelles. Une seule commande lance le faux GitHub et
  `nuxt dev`. Le fil en direct est amorcé par des livraisons signées, postées aux vraies routes de
  réception.
- **En faveur** :
  - **le dashboard exécute son propre code, sans aucun embranchement**, de la connexion jusqu'aux
    appels à l'API, cache, interprétation des erreurs et lecture des formats compris ;
  - **aucune porte n'est ajoutée à l'application.** La connexion suit le vrai parcours OAuth, face
    à un faux GitHub qui accepte aussitôt. Le principe 4 n'est pas assoupli, même en local ;
  - **l'image de production ne peut pas être redirigée** : les clés n'y existent pas (faits 1 et 2) ;
  - **les états difficiles s'obtiennent à la demande** (refus, quota épuisé, GitHub injoignable,
    dépôt vide), c'est-à-dire exactement les écrans `EtatEchec` et `EtatVide` qu'une refonte du
    design doit revoir ;
  - hors ligne, sans secret réel, sans quota ; une création de ticket va au faux, jamais dans
    cairn-wms.
- **En défaveur** :
  - un faux serveur à maintenir, qui doit suivre la forme des réponses de l'API réelle pour les
    champs que le dashboard lit ;
  - chaque nouvel appel à GitHub (tranches 7 et 8) devra y être ajouté ;
  - quatre fichiers serveur changent : les adresses deviennent lues dans la configuration.
- **Ce que ça ferme** : rien. Le faux GitHub se retire en supprimant un dossier et la clé
  `$development`.

### Option B — Données fictives injectées dans le serveur, route de connexion réservée au développement

- **Ce que c'est** : les clients de lecture (`ClientDoc`, `ClientTickets`) sont déjà injectables. En
  développement, le serveur les remplace par des versions qui lisent des fichiers. Une route propre
  au développement ouvre une session sans passer par GitHub.
- **En faveur** : aucun second processus, et moins de code à écrire au départ.
- **En défaveur** :
  - **une porte de connexion sans authentification ajoutée au code de l'application**, qu'une seule
    erreur de configuration séparerait de la production. C'est ce que le principe 4 interdit ;
  - un embranchement « fictif ou réel » dans chacune des huit routes qui créent un client ;
  - Octokit, le cache et l'interprétation des erreurs sont court-circuités : l'écran vu en local
    n'est pas nourri par le chemin de la production.
- **Ce que ça ferme** : rien de durable, mais la porte ajoutée resterait à surveiller.

### Option C — Un dépôt d'essai réel sur GitHub, une OAuth App locale et un jeton

- **Ce que c'est** : un second dépôt, rempli de données fictives, que le dashboard local lit par
  `NUXT_GITHUB_REPO`, avec une OAuth App dont l'URL de rappel est `localhost` et un jeton limité à ce
  dépôt.
- **En faveur** : aucune ligne de code modifiée, et le vrai GitHub.
- **En défaveur** :
  - un dépôt de plus, dont il faut créer et entretenir les issues, les labels et les jalons à la
    main ;
  - deux secrets de plus sur le poste ;
  - la latence et le quota de GitHub à chaque rechargement ;
  - les états d'échec ne s'obtiennent pas à la demande ;
  - le fil reste vide : GitHub ne joint pas `localhost`, et il faudrait l'amorcer comme dans A.
- **Ce que ça ferme** : rien.

## Décision

**Le développement local s'appuie sur un faux GitHub, lancé sur le poste avec `nuxt dev`. Les
adresses de GitHub ne sont substituables qu'en développement.**

Le critère décisif est que **rien de ce qui sert au développement ne peut ouvrir une porte en
production**. L'option B ajoute une connexion sans authentification au code même de l'application.
L'option A n'y ajoute que deux adresses, qui n'existent pas dans l'image de production, et laisse le
dashboard exécuter localement exactement le code qu'il exécute en ligne. L'option C est sûre elle
aussi, mais plus lente à chaque rechargement, ce qui est précisément le problème à résoudre, et elle
ne permet pas de revoir les états d'échec.

Décision validée en séance le 2026-09-18, sous une condition posée par Lucas : **aucun secret à
configurer sur le poste**. Les secrets locaux sont tirés au hasard à chaque lancement (ci-dessous),
ce qui la satisfait.

### Ce qui l'encadre

- **Les données sont fictives et le paraissent** : aucun nom réel, aucune donnée personnelle. Leur
  **forme** est celle de cairn-wms, relevée à la source (`status.yml` en couches et modules, en-tête
  YAML du journal, labels, jalons « Couche N — … », arborescence de `docs/`), et leur vocabulaire
  vient de son glossaire.
- **Le faux GitHub n'écoute que sur `127.0.0.1`**.
- **Les secrets locaux sont tirés au hasard à chaque lancement** et ne sont écrits nulle part : ils
  ne protègent qu'un faux. Un redémarrage demande donc de se reconnecter, en un clic.
- **Une base distincte** (`.data/fictif.db`, hors suivi) garde les événements fictifs à l'écart de
  toute autre base locale.
- **La preuve visuelle de la règle 7 ne change pas.** Ce mode sert à itérer ; les captures jointes au
  journal pour livrer une tranche restent prises sur l'écran réel.

## Conséquences

- **Ce qu'on peut faire** : voir chaque modification de l'interface en une seconde, sur le poste,
  connecté, avec des données qui couvrent les cas nominaux, vides et d'échec ; créer des tickets sans
  toucher à cairn-wms ; regarder le fil se remplir en direct.
- **Ce qu'on ne peut plus faire** : substituer les adresses de GitHub en production, ni ajouter une
  connexion propre au développement, sans nouvelle fiche.
- **Ce qu'il faut mettre en place** :
  - la configuration `$development` et la lecture des adresses dans les quatre fichiers serveur
    concernés ;
  - le faux GitHub et ses données, dans `scripts/dev/` ;
  - la commande `npm run dev:fictif` ;
  - **l'épreuve du garde-fou** : `scripts/ci/smoke` démarre l'image en lui donnant une fausse adresse
    d'API, et vérifie qu'elle l'ignore (`/health` toujours à 200 avec le vrai GitHub) ;
  - la mise en route dans le README ;
  - une issue qui porte ce travail. Il ne relève d'aucune tranche de `status.yml`.
- **Ce qu'on accepte de payer** : un faux à tenir en phase avec l'API réelle, pour les champs lus ;
  un écart qu'il ne verrait pas se découvrirait en production. Le poste tourne sous Node 24, l'image
  sous Node 22.23.2, épinglé à cause de `node:sqlite` ([`0006`](0006-bibliotheque-sqlite.md)) : un
  écart de comportement de la base ne se verrait pas en local.
- **Ce qui la remettrait en cause** : une forme de réponse de GitHub que le faux ne peut pas imiter
  fidèlement ; le besoin de travailler en local sur les vraies données, qui rouvrirait l'option C ou
  une variante en lecture seule.
