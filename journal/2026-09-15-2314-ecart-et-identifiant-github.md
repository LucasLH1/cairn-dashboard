---
date: 2026-09-15 23:14
objectif: Consigner l'écart temporaire au cadrage entre 1a et 1b, la restriction par identifiant GitHub et la condition du AAAA.
tranches: ["1a", "1b"]
issues: [1, 9]
---

# Session du 2026-09-15 — écart et identifiant GitHub

## Objectif

Consigner trois décisions prises sur les points ouverts de la session précédente. D'abord l'écart
au principe 4 du cadrage entre les tranches 1a et 1b, avec sa condition et sa borne. Ensuite la
restriction de la connexion au seul identifiant numérique GitHub. Enfin la condition de
l'enregistrement DNS `AAAA`. Ne pas commencer la tranche 1a.

## Actions

- Relevé les mentions à mettre à jour, dans le dépôt et dans les issues `#1` et `#9`.
- Complété le principe 4 du cadrage :
  - le compte autorisé est reconnu par son identifiant numérique ;
  - un encadré consigne l'écart temporaire, avec sa condition et sa borne ;
  - la section « Ce qu'il expose » y renvoie.
- Mis à jour l'issue `#1` :
  - le point à arbitrer est remplacé par l'écart accepté ;
  - la page d'accueil est définie comme un gabarit statique, sans donnée ni appel à GitHub ;
  - l'enregistrement `AAAA` est conditionné à l'inventaire du VPS ;
  - la définition de terminé est ajustée en conséquence.
- Mis à jour l'issue `#9` :
  - `NUXT_ALLOWED_GITHUB_LOGIN` est remplacé par `NUXT_ALLOWED_GITHUB_ID`, et le login ne sert
    plus qu'à l'affichage ;
  - la définition de terminé exige désormais la clôture de l'écart, et un test prouvant que le
    contrôle porte sur l'identifiant.
- Relevé l'identifiant numérique public du compte par l'API GitHub. Il n'est écrit ni dans le
  dépôt ni dans les issues, qui indiquent seulement où le lire.
- Committé et poussé. La tranche 1a n'est pas commencée.

## Décisions

Prises par Lucas en séance :

- **Écart accepté entre 1a et 1b.** La page d'accueil peut être publique, à condition d'être un
  gabarit statique, sans aucune donnée ni appel à GitHub. L'écart prend fin à la livraison de 1b.
  Il est consigné dans le cadrage, au principe 4.
- **Restriction par identifiant numérique GitHub uniquement**, par la variable
  `NUXT_ALLOWED_GITHUB_ID`. Le login ne sert qu'à l'affichage. Cela ferme le cas d'un login
  renommé, puis repris par un autre compte.
- **Enregistrement `AAAA`** : seulement si l'inventaire du VPS confirme une IPv6 opérationnelle.
- **Validés** : les noms de variables et la route `/auth/github`, laissés à relire dans l'entrée
  de 22:59. `NUXT_ALLOWED_GITHUB_LOGIN` fait exception : il est remplacé.

La fiche `0001` (« connexion GitHub, restreinte au compte `LucasLH1` ») reste exacte : le compte
est le même, seul le moyen de le reconnaître est précisé. Elle n'est pas retouchée.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `docs/cadrage.md` | Principe 4 : reconnaissance par identifiant numérique, et encadré de l'écart temporaire, borné à la livraison de 1b. Renvoi depuis « Ce qu'il expose ». |
| `journal/2026-09-15-2314-ecart-et-identifiant-github.md` | Créé. La présente entrée. |

`status.yml` est inchangé : aucune tranche n'a changé d'état.

## Issues liées

- `#1` — mise à jour : écart accepté, gabarit statique, condition du `AAAA`. Ouverte.
- `#9` — mise à jour : `NUXT_ALLOWED_GITHUB_ID`, et clôture de l'écart ajoutée à la définition de
  terminé. Ouverte.

## Points ouverts

- **L'écart est consigné au cadrage, sans fiche.** `docs/decisions/README.md` range
  « un assouplissement d'un principe de `docs/cadrage.md` » parmi ce qui mérite une fiche. La
  décision a été prise explicitement, et son inscription au cadrage demandée ; temporaire et
  bornée, elle se défait sans coût. Une fiche `0004` reste possible si l'on veut appliquer la règle
  à la lettre.
- **L'encadré devra être retiré à la livraison de 1b.** C'est une case de la définition de terminé
  de `#9`, et l'entrée de journal de cette session-là devra le relater.
- **L'entrée de 22:59 mentionne `NUXT_ALLOWED_GITHUB_LOGIN`.** Elle n'est pas réécrite : la
  présente entrée en consigne le remplacement.
- Les autres points ouverts des entrées précédentes restent ouverts :
  - les écrans des maquettes qui sortent du périmètre ;
  - les droits du jeton Coolify et l'activation de son API ;
  - le rattachement de cairn-wms au modèle de déploiement ;
  - l'hébergement de cairn-wms, qui n'est acté nulle part ;
  - la conservation des données OAuth du connecteur (`#7`).
