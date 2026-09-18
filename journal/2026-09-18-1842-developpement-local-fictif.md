---
date: 2026-09-18 18:42
objectif: Pouvoir lancer le dashboard sur le poste, sur données fictives et sans secret à configurer, pour itérer sur le design sans passer par la production.
tranches: []
issues: [22]
---

# Session du 2026-09-18 — développement local sur données fictives

## Objectif

Le dashboard n'a qu'un environnement, la production (fiche `0003`) : voir un changement d'interface
demandait jusqu'ici de fusionner vers `main`. Une refonte du design s'annonce, faite de nombreuses
petites modifications. Lucas veut les voir aussitôt, en local. Il a posé deux conditions : les vraies
données n'importent pas, et **aucun secret ne doit être à configurer**.

## Actions

### État des lieux

- **`npm run dev` démarre, mais ne rend rien d'utilisable** sur le poste. Mesuré : le `.env` ne porte
  que `NUXT_GITHUB_REPO` ; `/health` répond 503 (`github: non-configure`,
  `connexion: secret-de-session-absent`, `base: ok`) ; `/auth/github` répond 503 ; toute page mène à
  `/connexion`.
- Relevé que le code acceptait déjà le poste (cookies `Secure` en production seulement) et que la
  surface GitHub du serveur est courte et close : neuf appels, connexion comprise.
- Vérifié que les avertissements `Duplicated imports` de `nuxt dev` sont sans effet : chaque route
  importe explicitement le bon module.

### La fiche, puis la réalisation

- Une première proposition, un jeton en lecture seule et une OAuth App locale, a été écartée par
  Lucas : trop de configuration.
- **Fiche `0010` rédigée, proposée, puis actée en séance** : un faux GitHub local, et des adresses de
  GitHub substituables en développement seulement. Deux faits de Nuxt, vérifiés dans le code source
  installé et non de mémoire, la fondent : `$development` n'est fusionné (en profondeur, par `defu`)
  que sous `NODE_ENV=development`, et une variable `NUXT_*` ne peut que remplacer une clé qui existe
  déjà.
- **Serveur** : `server/utils/adresses-github.ts` rend les adresses réelles, sauf en développement ;
  les quatre fichiers qui les écrivaient en dur passent par lui. `doc-github.ts` importe désormais
  `noter` explicitement, comme `tickets-github.ts` le faisait déjà : il dépendait de l'import
  automatique de Nitro, et ne pouvait donc pas être exercé hors du serveur.
- **Faux GitHub** (`scripts/dev/faux-github.mjs`), sans dépendance, qui n'écoute que sur 127.0.0.1.
  Il sert l'arbre, les contenus, les issues, les labels, les jalons, la création d'issue, le parcours
  OAuth et `/user`. Il répond 304 aux requêtes conditionnelles, comme GitHub. Il offre six scénarios
  (`nominal`, `vide`, `refus`, `quota`, `injoignable`, `illisible`), réglables au lancement ou à
  chaud depuis `/_scenario`.
- **Données fictives** (`scripts/dev/donnees/`), à la forme de cairn-wms relevée à la source (règle 1) :
  `status.yml` en couches et modules, labels `couche/…` et `module/…`, jalons « Couche N — … »,
  en-tête du journal avec `modules`, arborescence de `docs/`, vocabulaire du glossaire. Elles
  couvrent les quatre états de module et une entrée de journal annulée (`annulee_par`). Elles
  comprennent un `README.md` de journal dont l'exemple d'en-tête ne doit pas être pris pour une
  entrée, deux pull requests à écarter et un titre de ticket très long. Le projet s'affiche comme
  « Cairn WMS — données fictives ».
- **`npm run dev:fictif`** (`scripts/dev/fictif.mjs`) lance le faux et `nuxt dev`, tire les secrets
  au hasard sans les écrire nulle part, repart d'une base propre (`.data/fictif.db`) et amorce le fil
  par les **vraies** routes de réception, livraisons signées. L'option `--fil N` ajoute un événement
  toutes les N secondes.

### Éprouvé sur le poste

- Connexion par le vrai parcours OAuth face au faux : trois redirections, puis l'accueil en 200.
- Les cinq écrans répondent 200. Les API rendent 13 modules, 12 documents, 7 entrées de journal
  (le README écarté, `annulee_par` conservé), 24 tickets (les deux pull requests écartées) et
  16 événements dans le fil. Les 13 modules se raccordent tous à leur label, les 5 couches à leur
  jalon.
- Création d'un ticket : `#27` créé dans le faux, en tête de liste, labels et jalon déduits.
- Les six scénarios, changés à chaud : chacun rend l'état attendu sur les quatre API après le délai
  du cache (30 s).
- Rien n'est parti vers GitHub : le jeton et les identifiants OAuth sont inventés, et le vrai GitHub
  les aurait refusés.
- **Essayé par Lucas depuis son navigateur, sous Windows** : « Tout tourne ». Le relais de WSL
  atteint donc le dashboard et le faux GitHub, parcours de connexion compris. L'issue `#22` est
  fermée.

### Les garde-fous

- **`test/faux-github.spec.ts`**, 15 tests : le faux passe au crible des vrais clients et des vrais
  analyseurs (suivi, arbre, journal, organisation des tickets, OAuth, sonde, scénarios, événements
  du fil). Si les données s'écartent du format lu, l'écart se voit là. Au total, 310 tests.
- **`scripts/ci/smoke`** : le conteneur nominal reçoit `NUXT_GITHUB_API_URL` et
  `NUXT_GITHUB_WEB_URL` pointées vers une adresse où rien n'écoute. `/health` à 200 et la connexion
  qui mène chez GitHub prouvent qu'elles sont ignorées. Test de fumée complet passé sur une image
  construite localement.
- **La preuve a été vue échouer.** Dans la construction réelle, la fonction de substitution se compile
  en `return null`, et les clés n'apparaissent nulle part dans `.output/`. Avec les adresses leurres,
  la connexion mène à `https://github.com/login/oauth/authorize`. Une copie du dépôt privée de ses
  deux verrous (garde `import.meta.dev` retirée, clés déclarées hors `$development`) mène à
  `http://127.0.0.1:9/login/oauth/authorize` : le test de fumée l'aurait refusée.

## Décisions

- **Fiche `0010` — Développement local sur données fictives**, actée en séance, sous la condition de
  Lucas : aucun secret à configurer.

Choix faits en réalisant, à relire :

- **Aucune tranche** : ce travail est de l'outillage du poste. Il est porté par l'issue `#22`, hors du
  découpage de `status.yml`.
- **Port 3999 pour le faux GitHub**, fixe, pour que l'adresse de `/_scenario` ne change pas d'un
  lancement à l'autre.
- **Identifiant du compte fictif : 4242.**
- **Le parcours OAuth passe par `localhost`, l'API par `127.0.0.1`**. Le navigateur atteint
  `localhost` depuis Windows, par le relais de WSL ; le serveur Node atteint le faux sans passer par
  la résolution de nom.
- **Le fil n'affiche pas d'heure** : amorcer par les routes (horodatage de réception « maintenant »)
  ne prive donc l'interface d'aucune donnée.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `docs/decisions/0010-developpement-local-sur-donnees-fictives.md` | Créée, actée. |
| `docs/decisions/README.md` | Fiche `0010` ajoutée à la table. |
| `nuxt.config.ts` | Clés `githubApiUrl` et `githubWebUrl`, sous `$development` seulement. |
| `server/utils/adresses-github.ts` | Créé. Les adresses de GitHub, et leurs deux verrous. |
| `server/utils/doc-github.ts`, `tickets-github.ts`, `sante-github.ts`, `oauth-github.ts` | Adresses lues par `adresses-github.ts`, plus écrites en dur. `noter` importé explicitement. |
| `scripts/dev/` | Créé : faux GitHub, amorce du fil, lanceur, données fictives. |
| `package.json` | Commande `dev:fictif`. |
| `scripts/ci/smoke` | L'image reçoit les adresses de développement et doit les ignorer. |
| `test/faux-github.spec.ts` | Créé, 15 tests. |
| `README.md`, `.env.example` | Mise en route sans configuration. |

## Issues liées

- `#22` — ouverte et fermée par cette session.

## Points ouverts

- **La refonte du design est-elle une tranche ?** La règle 6 veut une tranche à la fois, et la suivante
  est la 7. Question posée à Lucas, sans réponse à ce stade.
- **Node 24 sur le poste, 22.23.2 dans l'image** : un écart de `node:sqlite` ne se verrait pas en
  local. Aligner le poste (nvm) reste à faire.
- **Le faux ne suit l'API que pour les champs lus aujourd'hui.** Les tranches 7 et 8 devront y ajouter
  leurs appels.
- Points antérieurs inchangés : l'épreuve visuelle ne tourne pas en intégration continue.
