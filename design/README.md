# Design de référence

`cairn-design-system.html` est l'export de Claude Design qui fixe l'apparence du dashboard. Il est
rangé ici comme **référence**, pas comme code applicatif : aucun fichier de l'application ne
l'importe, et on n'en recopie pas le code — on en reprend les choix visuels.

Fourni le 2026-09-15. Il embarque la police DM Sans (SIL Open Font License) et React (licence MIT).

## Ce qu'il impose, ce qu'il suggère

La règle 7 de [`CLAUDE.md`](../CLAUDE.md) fait foi. En bref :

- **imposés** : les couleurs, les polices, les espacements et les composants ;
- **indicative** : la mise en page des maquettes ;
- **tout écart** se justifie par les données ou par l'usage, et se signale au journal ;
- **un composant absent** se construit avec les mêmes briques visuelles.

## Ce qu'on y trouve

Un thème sombre avec son sélecteur sombre / clair, la police DM Sans, une navigation latérale, et des
maquettes : vue d'ensemble (issues du jour, déploiements, intégration continue), semaine de
sessions de travail, consultation de la documentation.

## Le contenu des maquettes est fictif

Textes et données illustrent la mise en page. **Ils ne décrivent ni cairn-wms ni le dashboard**, et
n'ont valeur ni de décision ni de spécification :

- l'architecture montrée — services `cairn-api`, `cairn-worker`, `cairn-web`, `cairn-console`,
  FastAPI, Alembic, PostgreSQL, Caddy — n'est pas celle de cairn-wms, dont la pile n'est pas
  choisie ;
- la chaîne « push sur `main` → CI → image → staging » n'est pas le modèle retenu, qui promeut un SHA
  et déploie à la fusion de la pull request ([`docs/deploiement.md`](../docs/deploiement.md),
  fiche [`0003`](../docs/decisions/0003-dashboard-un-seul-environnement.md)) ;
- les écrans et fonctions absents du cadrage — planification de sessions avec minuteur et plafond
  horaire, entrées « Dépôt », « Branches », « Alertes » — n'étendent pas le périmètre :
  [`docs/cadrage.md`](../docs/cadrage.md) prime, et l'étendre passe par une fiche ;
- domaines, versions, numéros d'issue et de pipeline sont inventés.

## L'ouvrir

Dans un navigateur, JavaScript activé. L'export est autonome : ses scripts et ses polices sont
embarqués dans le fichier.

## Le mettre à jour

Un nouvel export remplace ce fichier, sous le même nom, dans un commit dédié ; l'entrée de journal de
la session dit ce qui a changé. Ce qui est déjà livré s'aligne sur le nouvel export, ou l'écart est
signalé.
