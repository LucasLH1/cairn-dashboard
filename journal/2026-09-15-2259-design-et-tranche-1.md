---
date: 2026-09-15 22:59
objectif: Ranger le design de référence et l'imposer, scinder la tranche 1 en 1a et 1b, lister ce qu'il faut préparer avant 1a.
tranches: ["1a", "1b", "8"]
issues: [1, 2, 3, 4, 5, 6, 7, 8, 9]
---

# Session du 2026-09-15 — design et tranche 1

## Objectif

Ranger dans `design/` l'export Claude Design, comme référence et non comme code, et en imposer les
choix visuels par une règle 7 de `CLAUDE.md`. Scinder la tranche 1 en 1a (squelette, thème, CI,
mise en ligne) et 1b (connexion GitHub), chacune livrée en ligne. Inscrire à l'issue `#8` le
préalable côté cairn-wms. Lister précisément ce qu'il faut préparer avant 1a, sans demander aucune
valeur secrète. Ne pas commencer la tranche 1a.

## Actions

- Trouvé l'export à la racine : `Cairn Design System.html` (297 Ko), accompagné de son
  `:Zone.Identifier`, une trace Windows de téléchargement qui ne contenait que `ZoneId=3`.
- Inspecté l'export avant de le verser dans un dépôt public. C'est une page empaquetée : un manifeste
  d'éléments compressés (script du canevas, React, ReactDOM, deux fichiers de la police DM Sans) et un
  gabarit HTML. Un premier balayage du fichier brut ne voyait que l'enveloppe : le contenu a donc été
  décodé, puis balayé en entier (jetons, clés, mots de passe, courriels, adresses IP, chemins locaux,
  noms). Rien de sensible.
- Relevé que le contenu des maquettes est fictif et contredit les décisions : architecture FastAPI,
  PostgreSQL et Caddy en quatre services, chaîne « push sur `main` → staging », écrans hors cadrage.
- Rangé l'export sous `design/cairn-design-system.html` (empreinte `sha256` identique avant et
  après), supprimé le `Zone.Identifier` et ajouté `design/README.md`.
- Exclu du suivi les `*:Zone.Identifier`, et déclaré l'export comme fichier généré, hors diffs.
- Ajouté la règle 7 à `CLAUDE.md`, et `design/` aux lectures de la règle 1.
- Scindé la tranche 1 :
  - label `tranche/1-squelette` renommé `tranche/1a-squelette`, que l'issue `#1` conserve ;
  - label `tranche/1b-connexion-github` créé ;
  - issue `#1` réécrite pour la tranche 1a, issue `#9` créée pour la tranche 1b ;
  - `status.yml` passé à neuf tranches.
- Passé les identifiants de tranche en chaînes, dans `status.yml` et dans l'en-tête du journal.
- Retiré le nombre de tranches (« huit ») du README, du cadrage et de la règle 6 : la liste ne vit
  plus que dans `status.yml`.
- Issues : préalable côté cairn-wms explicité dans `#8`, en quatre cases à cocher. Dans `#2` à `#8`,
  « Tranche N sur 8 » est devenu « Tranche N » ; `#2` suit désormais la tranche 1b (`#9`).
- Rédigé la liste de préparation de 1a dans `#1`, et celle de 1b dans `#9` : noms des variables et
  des secrets, URL de rappel, droits du jeton, sans aucune valeur.
- Vérifié `status.yml` et les liens relatifs, puis committé et poussé. La tranche 1a n'est pas
  commencée.

## Décisions

Aucune fiche : rien d'engageant au sens de `docs/decisions/README.md`.

Demandé explicitement :

- Règle 7 : couleurs, polices, espacements et composants du design imposés ; mise en page
  indicative ; tout écart justifié par les données ou l'usage et signalé au journal ; un composant
  absent se construit avec les mêmes briques visuelles.
- Tranche 1 scindée en 1a et 1b, chacune livrée en ligne.
- Préalable de `#8` : la pile de cairn-wms, son `deploiement.yml`, ses environnements, `/version` et
  `/health`.

Choix faits en rédigeant, sans validation explicite, à relire :

- **Identifiants de tranche en chaînes** (`"1a"`, `"2"`), pour que toutes gardent la même forme.
  L'entrée de 22:16, antérieure, garde des entiers et n'est pas réécrite.
- **Nommage** : l'export est renommé `cairn-design-system.html`, en minuscules et tirets ; les
  labels sont `tranche/1a-squelette` et `tranche/1b-connexion-github` ; la tranche 1b est portée par
  une nouvelle issue, `#9`, plutôt que par une renumérotation.
- **Variables d'environnement**, nommées dans les issues : `NUXT_GITHUB_TOKEN` et
  `NUXT_GITHUB_REPO` pour 1a ; `NUXT_OAUTH_GITHUB_CLIENT_ID`, `NUXT_OAUTH_GITHUB_CLIENT_SECRET`,
  `NUXT_SESSION_PASSWORD` et `NUXT_ALLOWED_GITHUB_LOGIN` pour 1b. Le préfixe `NUXT_` alimente la
  configuration d'exécution de Nuxt ; les noms OAuth et session sont les noms usuels de l'écosystème
  Nuxt et n'engagent aucune bibliothèque.
- **Connexion GitHub** : route de rappel `/auth/github`, et une OAuth App locale distincte de celle
  de production, puisqu'une OAuth App n'accepte qu'une URL de rappel.
- **Jeton GitHub** : un jeton *fine-grained* restreint à cairn-wms, avec la seule permission
  *Metadata* pour 1a.
- **CI** : aucun secret de dépôt ; le `GITHUB_TOKEN` du workflow publie l'image et sert au test de
  fumée.
- **Fiches `0001` à `0003` non retouchées** : actées, elles ne se réécrivent pas. Leur « tranche 1 »
  désigne désormais le couple 1a et 1b. Tout ce qu'elles y rattachent — contrat commun, mise en
  service, `/health` sur le jeton GitHub — relève de 1a.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `design/cairn-design-system.html` | Ajouté. L'export Claude Design, à l'identique, renommé. |
| `design/README.md` | Créé. Statut de référence, ce qui est imposé ou indicatif, contenu fictif des maquettes, mise à jour. |
| `CLAUDE.md` | Règle 7 ajoutée ; `design/` dans les lectures de la règle 1 ; nombre de tranches retiré de la règle 6. |
| `status.yml` | Tranche 1 scindée en 1a (`#1`) et 1b (`#9`) ; identifiants en chaînes. |
| `README.md` | `design/` dans la structure ; la réalisation commence avec 1a ; nombre de tranches retiré. |
| `docs/cadrage.md` | Nombre de tranches retiré du principe 5. |
| `journal/README.md` | Identifiants de tranche en chaînes, entre guillemets. |
| `.gitignore` | Exclut les `*:Zone.Identifier`. |
| `.gitattributes` | Déclare l'export du design comme fichier généré, hors diffs. |
| `journal/2026-09-15-2259-design-et-tranche-1.md` | Créé. La présente entrée. |

## Issues liées

- `#1` — réécrite pour la tranche 1a : périmètre, point à arbitrer, liste de préparation ; label
  renommé. Ouverte.
- `#9` — créée pour la tranche 1b, avec sa liste de préparation. Ouverte.
- `#8` — préalable côté cairn-wms explicité. Ouverte, bloquée.
- `#2` — suit désormais la tranche 1b (`#9`). Ouverte.
- `#3` à `#7` — en-tête « Tranche N sur 8 » corrigé. Ouvertes.

## Points ouverts

- **La tranche 1a met en ligne une page publique.** Le principe 4 du cadrage n'admet sans
  authentification que `/version` et `/health` ; entre 1a et 1b, la page d'accueil le sera aussi.
  Elle n'affichera aucune donnée, mais l'écart doit être accepté, ou couvert par une protection
  provisoire, avant la mise en ligne. Noté dans `#1`.
- **Les maquettes montrent plus que le périmètre** : planification de sessions avec minuteur, entrées
  « Dépôt », « Branches », « Alertes ». Rien de cela n'est au cadrage. `design/README.md` le dit,
  mais les ajouter ou y renoncer reste à trancher.
- **Restreindre par login GitHub a une faille.** Un login peut être renommé puis repris par un autre
  compte. Vérifier aussi l'identifiant numérique du compte, public et immuable, fermerait ce cas ; ce
  n'est pas retenu sans validation.
- **À confirmer dans Coolify** : les droits exacts à donner au jeton d'API, et l'activation de l'API.
- **Les fiches `0001` à `0003` parlent de « tranche 1 »** : la correspondance avec 1a est notée ici,
  sans réécriture.
- Les points ouverts de l'entrée de 22:16 restent ouverts : rattachement de cairn-wms au modèle de
  déploiement, hébergement de cairn-wms non acté, données OAuth du connecteur (`#7`).
