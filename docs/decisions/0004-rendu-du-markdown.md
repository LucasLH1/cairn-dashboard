# 0004 — Rendu du Markdown de cairn-wms

**Statut** : actée · **Date** : 2026-09-16 · **Remplace** : — · **Remplacée par** : —

## Contexte

La tranche 2 (`status.yml`, issue #2) doit rendre consultable la documentation de cairn-wms depuis le
dashboard. Cette documentation est du Markdown, lu par l'API GitHub sur la branche `dev` : 18 entrées
sous `docs/`, sur trois niveaux, des documents allant jusqu'à 30 Ko, avec des tableaux, des citations,
du code et des liens relatifs d'un document à l'autre.

Il faut donc transformer ce Markdown en HTML. La fiche `0001` acte la pile — TypeScript, Nuxt, Nitro,
SQLite, Octokit, SDK MCP — mais **ne tranche rien sur le rendu du Markdown**. Or
`docs/decisions/README.md` range « une bibliothèque structurante : une dépendance qu'on ne pourrait
plus retirer sans réécrire » parmi ce qui mérite une fiche : le moteur de rendu traversera les
tranches 2, 5 et 7, et ses choix de sécurité engagent tout ce que le dashboard affichera.

**La contrainte de sécurité est explicite** : aucun HTML brut ne doit être exécuté, et les liens
externes doivent être neutralisés. Le contenu vient d'un dépôt public, écrit aussi par des sessions
automatisées : il n'est pas de confiance par nature.

Ce qui suit a été **vérifié dans le code des paquets**, pas supposé.

## Options

### Option A — `markdown-it`, avec ses options par défaut

- **Ce que c'est** : un analyseur Markdown conforme CommonMark, avec les tableaux GFM. Le preset par
  défaut pose `html: false` ; les deux règles qui reconnaissent le HTML — `html_block` et
  `html_inline` — commencent par `if (!state.md.options.html) return false;`. Le HTML brut du source
  n'est donc jamais émis : il retombe en texte, échappé. Les liens se neutralisent par une règle de
  rendu, quelques lignes à nous.
- **En faveur** : la sûreté est le **comportement par défaut**, pas une étape qu'on peut oublier ;
  aucun assainisseur à ajouter, donc pas de second point de défaillance ; pas de DOM côté serveur ;
  MIT ; extensible par greffons si une tranche ultérieure en a besoin.
- **En défaveur** : 1,9 Mo décompressés et six dépendances transitives (`mdurl`, `argparse`,
  `entities`, `uc.micro`, `linkify-it`, `punycode.js`) ; le rendu n'est pas au pixel celui de GitHub.
- **Ce que ça ferme** : rien d'irréversible — le rendu est isolé derrière un utilitaire serveur.

### Option B — `marked` + un assainisseur (`DOMPurify` ou `sanitize-html`)

- **Ce que c'est** : `marked` transforme le Markdown en HTML, un assainisseur nettoie ensuite le
  résultat. `marked` est plus léger (483 Ko, **zéro dépendance**).
- **En faveur** : le paquet de rendu est nettement plus petit et sans dépendance.
- **En défaveur** : **`marked` ne protège rien par lui-même**. Son README l'écrit noir sur blanc :
  « Marked does not sanitize the output HTML », et renvoie vers DOMPurify. La sûreté repose donc
  entièrement sur une seconde bibliothèque et sur le fait de ne jamais oublier de l'appeler — une
  omission ne casse rien de visible, elle ouvre une faille silencieuse. DOMPurify suppose en outre un
  DOM côté serveur (donc `jsdom`, lourd), et `sanitize-html` tire sept dépendances. Au total, on ne
  gagne pas en légèreté.
- **Ce que ça ferme** : rien, mais impose une discipline d'appel à chaque point de rendu, présent et
  futur.

### Option C — Faire rendre le Markdown par l'API GitHub (`POST /markdown`)

- **Ce que c'est** : GitHub rend lui-même le Markdown et renvoie le HTML. Vérifié : l'appel
  fonctionne et rend `# Titre` en `<h1>Titre</h1>`.
- **En faveur** : aucune bibliothèque de rendu ; le résultat est exactement celui de GitHub, y compris
  ses extensions.
- **En défaveur** : **chaque affichage consomme le quota** de l'API, déjà nécessaire à la lecture des
  fichiers ; la page ne s'affiche plus si GitHub est indisponible ou le quota épuisé ; latence d'un
  aller-retour réseau à chaque document ; et le HTML renvoyé contient le HTML brut du source, donc il
  faut **quand même** un assainisseur. On paie la dépendance réseau sans gagner la sûreté.
- **Ce que ça ferme** : tout rendu hors ligne, et tout rendu en volume (tranches 5 et 7).

## Décision

**Le dashboard rend le Markdown avec `markdown-it`, dans sa configuration par défaut, et neutralise
les liens par une règle de rendu maison.**

Le critère décisif est la **sûreté par défaut** : dans l'option A, ne rien faire de particulier
produit déjà le comportement voulu, alors que les options B et C exigent un assainisseur dont l'oubli
ne se voit pas. Une faille silencieuse coûte plus cher que 1,4 Mo de dépendances.

Le surcoût de poids est accepté : il ne concerne que l'image du serveur, jamais le navigateur.

Décision validée en séance le 2026-09-16, sur les trois options ci-dessus. Elle n'engage en rien la
pile de cairn-wms.

## Conséquences

- **Ce qu'on peut faire** : afficher tout document de `docs/` de cairn-wms, tableaux compris, sans
  exécuter le moindre HTML venu du dépôt ; suivre les liens relatifs d'un document à l'autre à
  l'intérieur du dashboard.
- **Ce qu'on ne peut plus faire** : accepter du HTML dans la documentation affichée — un document qui
  en contiendrait le verrait rendu en texte, visiblement. C'est voulu.
- **Ce qu'il faut mettre en place** : un utilitaire serveur unique qui rend le Markdown ; la règle de
  rendu des liens — relatifs résolus vers le dashboard, externes neutralisés — et son test ; tranche
  2 (issue #2), qui passe en développement.
- **Ce qu'on accepte de payer** : six dépendances transitives, et un rendu qui n'est pas au pixel
  celui de GitHub.
- **Ce qui la remettrait en cause** : le besoin d'afficher du HTML légitime venu de la documentation,
  ou l'apparition d'une extension Markdown que `markdown-it` ne couvre pas sans greffon lourd.
