# 0006 — Bibliothèque d'accès à SQLite

**Statut** : actée · **Date** : 2026-09-16 · **Remplace** : — · **Remplacée par** : —

## Contexte

La tranche 5 (`status.yml`, issue #5) fait du dashboard autre chose qu'une interface : il va
**recevoir** des événements — webhooks GitHub, puis hooks Claude Code — et les **conserver**. C'est sa
seule donnée propre, et la fiche `0001` a déjà tranché qu'elle vivrait dans SQLite.

Ce qui n'est pas tranché, c'est **par quoi** on y accède. Le choix engage : il traversera les tranches
5, 6 et 8, il conditionne la composition de l'image, et il sera difficile à défaire une fois que des
données réelles y seront.

Deux contraintes d'exploitation encadrent le choix :

- l'image est bâtie sur `node:22-alpine`, donc sur **musl** ;
- le dashboard tourne en **une seule instance** (fiche `0001`), et le volume attendu est faible :
  les événements d'un seul dépôt, quelques dizaines par semaine.

Ce qui suit a été **mesuré dans l'image réelle**, pas supposé.

## Options

### Option A — `node:sqlite`, le module de Node

- **Ce que c'est** : SQLite intégré à Node. Mesuré dans `node:22-alpine` (Node 22.23.2) : chargeable
  **sans aucun indicateur**, expose `DatabaseSync`, `StatementSync`, `constants`, `backup`. Une base
  écrite sur fichier fait 12 288 octets, est **relue par un autre processus**, et la contrainte
  `UNIQUE` est respectée — ce qui suffit à rejeter une livraison de webhook déjà reçue.
- **En faveur** : **rien à installer, rien à compiler, aucun octet ajouté à l'image**. Aucune
  dépendance native à faire correspondre à l'ABI de Node — donc aucune recompilation à chaque montée
  de version. API synchrone, comme `better-sqlite3`.
- **En défaveur** : **expérimental sous Node 22** — `SQLite is an experimental feature and might
  change at any time`. Sous Node 24, il se charge sans cet avertissement : la trajectoire va vers la
  stabilisation, mais elle n'y est pas encore pour notre version.
- **Ce que ça ferme** : rien, si l'accès est isolé derrière un module unique.

### Option B — `better-sqlite3`

- **Ce que c'est** : la bibliothèque synchrone de référence. Version 13.0.3, licence MIT, dépend de
  `node-addon-api`. Mesuré : installée sur `node:22-alpine` **en une seconde, sans compilation** — un
  binaire musl prêt à l'emploi existe, contrairement à ce que je supposais avant de le vérifier.
  Fonctionne, contrainte `UNIQUE` respectée.
- **En faveur** : API stable et mûre, largement éprouvée, aucun avertissement expérimental.
- **En défaveur** : **26,2 Mo** dans l'image, et surtout une dépendance **native** : le binaire est lié
  à l'ABI de Node. Une montée de version majeure de Node exige un binaire correspondant ; le jour où
  il manque pour musl, l'image ne se construit plus — un risque qui ne se manifeste qu'au pire moment.
- **Ce que ça ferme** : rien.

### Option C — `node-sqlite3-wasm`

- **Ce que c'est** : SQLite compilé en WebAssembly. Version 0.8.60, MIT, **zéro dépendance**, 1,3 Mo.
  Mesuré : persiste sur fichier, relu par un autre processus, `UNIQUE` respectée.
- **En faveur** : aucun binaire natif, donc insensible à l'ABI de Node et à la libc ; léger.
- **En défaveur** : WebAssembly est plus lent que le natif — sans importance à ce volume — et le
  projet est nettement moins établi que les deux autres. Une dépendance de moins que B, mais une de
  plus que A.
- **Ce que ça ferme** : rien.

*`sql.js` a été écarté sans être mesuré : il tient la base en mémoire et impose d'écrire le fichier
soi-même à chaque changement. Pour un serveur qui reçoit des webhooks, c'est un risque de perte à
chaque arrêt.*

## Décision

**Le dashboard accède à SQLite par `node:sqlite`, le module de Node, et l'accès est isolé derrière un
seul module serveur.**

Le critère décisif est la **surface de dépendance** : aucune bibliothèque à installer, aucun binaire
natif à faire correspondre à l'ABI de Node, aucun octet ajouté à l'image. Pour une donnée qui doit
survivre des années à raison de quelques dizaines d'écritures par semaine, ce qui compte n'est pas la
vitesse mais ce qui peut casser un jour de reconstruction.

Le statut expérimental est le prix à payer, et il est **borné par deux mesures** : l'accès est isolé
derrière un module unique, et **la version de Node est épinglée dans le `Dockerfile`** — sans quoi une
reconstruction pourrait tirer une version mineure dont l'API aurait changé.

Décision validée en séance le 2026-09-16, sur les trois options mesurées ci-dessus. Elle n'engage en
rien la pile de cairn-wms.

## Conséquences

- **Ce qu'on peut faire** : conserver l'historique des événements sans ajouter la moindre dépendance,
  et le lire de façon synchrone depuis le serveur.
- **Ce qu'on ne peut plus faire** : employer `node:sqlite` ailleurs que derrière le module d'accès —
  c'est ce qui rendra un changement de bibliothèque peu coûteux si l'API expérimentale bougeait.
- **Ce qu'il faut mettre en place** : le module d'accès unique ; **l'épinglage de la version de Node
  dans le `Dockerfile`**, aujourd'hui `node:22-alpine`, étiquette mouvante ; la vérification de la
  base dans `/health` ; tranche 5 (issue #5).
- **Ce qu'on accepte de payer** : un avertissement expérimental dans les traces du serveur, et le
  risque qu'une montée de Node demande une adaptation — que l'épinglage transforme en décision
  consciente plutôt qu'en panne.
- **Ce qui la remettrait en cause** : un changement d'API de `node:sqlite` qui coûterait plus cher que
  la migration vers `better-sqlite3`, ou le besoin de faire tourner plusieurs instances — auquel cas
  c'est SQLite lui-même, et donc la fiche `0001`, qu'il faudrait rouvrir.
