---
date: 2026-09-18 19:20
objectif: Reproduire fidèlement le design de référence, écran par écran, sur les données réelles — le constat de Lucas étant que l'application ne lui ressemble pas.
tranches: ["6b"]
issues: [23]
---

# Session du 2026-09-18 — reproduction fidèle du design

## Objectif

Lucas : « le design template me convient parfaitement mais tu ne le reproduis pas fidèlement du
tout ». La tranche 6b, ouverte en début de soirée comme une refonte, change donc de nature : la
référence ne bouge pas, c'est l'application qui doit la suivre. Le but de la session est de relever
l'écart à la source, de le combler sur tous les écrans, et de le montrer — sur le poste, en mode
fictif, pour que Lucas puisse trancher avant toute mise en production.

## Actions

### Constat, à la source

- **Comparé avant de juger**, captures côte à côte, 1440 et 390 px, deux thèmes. Le socle de la
  tranche 1c est fidèle — cadre, rail, en-tête, rayon des cartes — mais tout ce qui fait l'identité
  du design manque : la composition dense qui remplit l'écran, la colonne latérale droite, la
  variété des composants dans les cartes, l'accent orange et les couleurs d'état partout.
  L'application, c'était quatre cartes grises identiques sur une rangée, et un vide en dessous.
- **Décodé l'export** : le fichier embarque le moteur de Claude Design (gzip en base64) et, dans un
  gabarit HTML, le design lui-même — 53 Ko de balisage à styles en ligne, et 4 Ko de logique. Chaque
  mesure a été relevée là : couleurs des deux thèmes, teintes d'état et leurs alphas, rayons
  (6, 7, 8, 9, 10, 11, 12, 13, 14, 18 px), tailles (11 à 31 px), bases de flex des colonnes.
- **Deux faits que le décodage a révélés.** Le design a deux vues, « Tableau de bord » et
  « Documentation », et **la colonne latérale droite est présente sur les deux** : elle appartient
  à l'ossature, pas à l'accueil. Et il n'a **aucune règle d'adaptation à la largeur** : ses grilles
  `auto-fit` et ses bases de flex suffisent, ce qui confirme ce que la 1c avait vu à 390 px.
- **Recadré la tranche** : issue #23 réécrite (tableau des écarts, plus de nouvel export), libellé
  « Reproduction fidèle du design », `status.yml` en développement.

### L'outillage, d'abord

- **`scripts/visuel/captures.mjs` capture tous les écrans** (`--ecrans nom=chemin,…`) et les deux
  vues du design, au lieu du seul accueil.
- **Le mode fictif accepte un secret de session fourni** (`NUXT_SESSION_PASSWORD`), pour que
  l'épreuve visuelle puisse forger sa session contre lui — sans rien changer à la condition de la
  fiche `0010` : sans variable, le secret reste tiré au hasard.
- **Le navigateur de l'épreuve a été remis en marche** : `libnss3`, `libnspr4` et `libasound2t64`
  téléchargés par `apt-get download`, extraits dans un dossier de session, fournis par
  `LD_LIBRARY_PATH`. Rien n'a été installé sur le poste, comme en 1c. Même chose pour `pngquant`
  et `libimagequant0`.

### Les briques du design, puis chaque écran

- **Jetons complétés** avec toutes les valeurs relevées : teintes d'état (fond, filet, survol, bloc,
  colonne), texte sur accent (`#161316`, le design ne l'écrit jamais blanc), rayons et tailles
  manquants, bases de flex, dégradé des barres.
- **Briques créées**, chacune aux mesures du gabarit : `BaseCard` (deux en-têtes : liste à pastille
  de compte et lien, ou mise en avant centrée), `LigneListe` (disque d'icône, glyphes lecture et
  pause dessinés en CSS, ligne courante cernée), `BaseTuile` (neutre, teintée, compacte),
  `BaseEtiquette` (courte et ronde à point), `LienChevron`, `ControleSegmente`, `BoutonPrimaire`
  (bleu, et sa forme tuile à disque « + »), `BoutonSecondaire`, `GrosChiffre`, `BarresActivite`,
  `AnneauParts` (dégradé conique à parts séparées), `SemaineGrille`, `ZonePrincipale`.
- **Ossature** : le contenu se partage entre la zone principale et `AppLateral`, présente sur tous
  les écrans comme dans le design. L'en-tête reçoit le point de présence de l'avatar.
- **Accueil** recomposé sur le « Tableau de bord » : trois cartes, la section « Semaine » et sa
  grille, la colonne latérale — voir les correspondances dans les décisions.
- **Documentation** recomposée sur sa vue : navigation groupée à entrée active teintée, champ de
  recherche à `⌘K`, tuile de source en bas ; article à chemin, titre, étiquette et métadonnées,
  filet, corps aux tailles du design (14 px, interligne 1,7, 68 caractères), encart pour les
  citations, bloc de code à coins de 13 px ; « Sur cette page » qui suit le défilement ; « Voir sur
  GitHub ↗ ». L'index du dossier ouvre le `README.md` s'il existe.
- **Avancement, journal, tickets** : pas de vue dans le design ; rebâtis avec ses briques. Les
  champs de saisie prennent la tuile, les filtres le bouton discret, la création le bouton bleu.
- **Éprouvé** : lint (deux avertissements `v-html` connus, justifiés par la fiche `0004`), typage,
  310 tests ; captures de six écrans dans les deux thèmes et aux deux largeurs, comparées au design.
  Un avertissement `NuxtLink` non résolu a été corrigé — un composant dynamique ne peut pas
  résoudre `NuxtLink` par son nom, il faut l'importer de `#components` — et prouvé disparu par un
  rechargement témoin.

### Ce que Lucas voit déjà

Son `npm run dev:fictif` sert cet arbre de travail à chaud : http://localhost:3000 montre l'état
de fin de session.

## Décisions

Aucune fiche : aucune dépendance, aucun choix engageant. Tout ce qui suit relève de la règle 7 —
**seul l'agencement des blocs suit les données réelles**, et chaque écart se signale ici.

### Les correspondances, bloc par bloc

| Le design | L'application | Pourquoi |
|---|---|---|
| Carte mise en avant : session, minuteur, disque lecture/pause, tuiles « Aujourd'hui / Plafond » | L'avancement de cairn-wms : disque d'accent qui porte la part des modules au-delà d'« à faire » et mène au détail, quatre tuiles pour les quatre états | Le minuteur est hors cadrage ; le disque garde sa place et son rôle de porte d'entrée |
| « Issues du jour » : lignes à disque, la première courante | Les trois derniers tickets ouverts ; la ligne courante est un `bug` | Même donnée, même forme ; le lien d'en-tête va aux issues sur GitHub, comme dans le design |
| « Déploiements » : grille 2 × 2 de tuiles, une teintée | Les quatre dernières entrées du journal, la plus récente teintée d'accent | Les déploiements viennent avec la tranche 8 ; le journal a la même forme libellé / valeur / détail |
| « Semaine » : sessions planifiées, jour par jour | Les entrées de journal et les sessions Claude Code de la semaine, telles qu'elles ont eu lieu ; « Jour » ne montre qu'aujourd'hui | Ce sont les seules sessions réelles que le dashboard connaît (tranches 5 et 6) |
| Colonne « Activité », « Domaines touchés », « Alertes », bouton bleu | Le fil en direct : nombre d'événements sur sept jours et barres par jour ; anneau par source ; tuiles des derniers événements, sessions regroupées ; « Ouvrir le journal » | La seule donnée propre du dashboard, sous les trois formes du design ; le regroupement de la fiche `0009` est conservé |
| Vue Documentation : navigation, article, « Sur cette page », « Historique » | Même ossature ; « Historique » absent | L'historique des commits exigerait un appel GitHub de plus, hors de cette tranche |

### Les écarts assumés

- **Non repris, faute de donnée ou de cible réelle** : le minuteur et le plafond horaire ; l'étoile
  de favori des lignes ; « Nouvelle session », « Réglages », « Aide » et l'entrée « Alertes » à badge
  du rail ; la cloche de l'en-tête ; le « ⋮ » des blocs latéraux ; le bouton « Filtre » ; les portées
  « Mois » et « Année » du contrôle segmenté, qui n'aurait sinon que des boutons morts.
- **L'axe des heures de la grille n'est pas repris** : les blocs du design ne le suivent pas, ils
  s'empilent. Un axe que rien ne suit dirait faux ; les heures sont dans les repères des blocs.
- **Les tuiles du fil portent leur valeur à 14,5 px** (celle des tuiles de déploiement), non à 16 px
  (celle des tuiles d'alerte) : elles portent des titres longs, pas « 12 j ».
- **La carte « Ce qui vient ensuite » disparaît** : le design n'a pas de bloc pour elle, et
  `status.yml` porte déjà l'information.
- **Le fond de page du thème clair** reste celui rebâti en 1c : le pourtour sombre du design est le
  décor de sa vitrine.
- **Deux ajouts d'interface, avec les briques du design** : le champ « Rechercher » filtre la
  navigation de la documentation sur le poste (`⌘K` et `Ctrl+K` le prennent), et le point de
  présence de l'avatar dit si le fil en direct est ouvert — le seul « en ligne » qui ait un sens.
  Ni l'un ni l'autre ne lit ni n'écrit quoi que ce soit.
- **Les groupes de la navigation** portent le nom de leur dossier ; la racine s'appelle « Aperçu »,
  comme dans le design. Les noms de fichiers restent les titres, tirets devenus espaces.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `app/assets/css/tokens.css`, `base.css` | Jetons complétés ; champs de saisie et filtres sur les briques du design. |
| `app/layouts/default.vue` | Le contenu se partage entre la zone principale et la colonne latérale. |
| `app/components/AppLateral.vue` | Créé. La colonne latérale : fil en direct, barres, anneau, tuiles. |
| `app/components/AppHeader.vue` | Point de présence sur l'avatar, hauteur et remplissage du design. |
| `app/components/BaseCard.vue`, `EtatVide.vue`, `EtatEchec.vue` | Les deux en-têtes du design ; les états sur la tuile cernée. |
| `app/components/{AnneauParts,BarresActivite,BaseEtiquette,BaseTuile,BoutonPrimaire,BoutonSecondaire,ControleSegmente,GrosChiffre,LienChevron,LigneListe,SemaineGrille,ZonePrincipale}.vue` | Créés. Les briques, aux mesures du gabarit. |
| `app/components/DocLecture.vue` | Créé. La vue Documentation : navigation, article, « Sur cette page ». |
| `app/pages/index.vue` | L'accueil recomposé sur le « Tableau de bord ». |
| `app/pages/documentation/*.vue` | Réduites à `DocLecture`. |
| `app/pages/avancement.vue`, `journal.vue`, `tickets.vue` | Recomposées sur les briques. |
| `app/composables/useFil.ts`, `useFilDirect.ts` | Le fil partagé par tous ceux qui l'affichent ; l'état de la connexion partagé. |
| `app/utils/temps.ts` | Créé. Dates, heures, semaine, durées, telles que les écrans les disent. |
| `scripts/visuel/captures.mjs` | Tous les écrans, les deux vues du design. |
| `scripts/dev/fictif.mjs` | Secret de session fourni par l'environnement, pour l'épreuve visuelle. |
| `journal/captures/2026-09-18-tranche-6b/` | Huit captures : accueil et documentation, 1440 et 390 px, sombre et clair — sur données fictives. |

## Issues liées

- `#23` — tranche 6b, engagée par cette session ; commentée.

## Points ouverts

- **La tranche n'est pas livrée.** Il manque le regard de Lucas sur ces écrans, ses retouches, puis
  la pull request vers `main` — décision humaine — et la mise en production.
- **Les captures jointes sont prises sur les données fictives**, pas sur l'écran réel connecté que
  la règle 7 exige pour livrer. Elles montrent la forme ; la preuve de livraison se refera sur la
  production.
- **Le fil en direct est désormais sur tous les écrans**, avec une connexion WebSocket unique : à
  constater en production, sur plusieurs onglets.
- **Les groupes de la documentation sont dans l'ordre alphabétique des dossiers**, celui de l'arbre ;
  l'ordre des couches de `status.yml` serait plus parlant, mais l'arbre ne le connaît pas.
- Points antérieurs inchangés : Node 24 sur le poste contre 22.23.2 dans l'image ; l'épreuve
  visuelle ne tourne pas en intégration continue.
