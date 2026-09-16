# 0007 — Schéma et conservation de l'historique des événements

**Statut** : actée · **Date** : 2026-09-16 · **Remplace** : — · **Remplacée par** : —

## Contexte

La tranche 5 fait recevoir au dashboard les webhooks GitHub de cairn-wms, et la tranche 6 y ajoutera
les hooks Claude Code. Ces événements forment **la seule donnée propre du dashboard**
(`docs/cadrage.md`), celle qu'il ne peut pas relire ailleurs : GitHub ne conserve pas l'historique des
livraisons au-delà de quelques semaines, et les sessions Claude Code ne laissent aucune trace
consultable.

La fiche `0001` impose qu'une fiche décrive le schéma **avant toute implémentation**, et l'issue #5 en
fait un préalable bloquant.

Trois contraintes cadrent le schéma :

- une seule instance, un seul fichier de base, sur un volume persistant ;
- une livraison peut arriver **deux fois** — GitHub réessaie quand il n'obtient pas de réponse — et ne
  doit être enregistrée qu'une fois ;
- le fil doit se lire à l'envers du temps, et rester rapide quand l'historique grandit.

## Options

### Option A — Une table unique, la charge utile conservée entière

- **Ce que c'est** : une ligne par événement, avec les champs qu'on affiche extraits en colonnes, et
  le corps reçu conservé tel quel à côté.
- **En faveur** : on ne perd rien ; un besoin d'affichage futur se sert dans la charge sans migration
  ni réémission. Le fil se lit d'un seul index.
- **En défaveur** : la charge d'un webhook GitHub pèse de quelques kilo-octets à plusieurs dizaines ;
  l'historique grossit bien plus vite que ce que l'affichage exige.
- **Ce que ça ferme** : rien.

### Option B — Une table unique, seuls les champs affichés

- **Ce que c'est** : on extrait ce qu'on affiche et on jette le reste.
- **En faveur** : la base reste minuscule.
- **En défaveur** : **irréversible**. Tout besoin nouveau — un champ qu'on n'avait pas prévu — ne peut
  être satisfait que pour les événements à venir. Or c'est précisément ce qu'un historique doit
  éviter : il existe pour répondre à des questions qu'on ne s'est pas encore posées.
- **Ce que ça ferme** : toute exploitation non anticipée du passé.

### Option C — Deux tables, métadonnées et charges séparées

- **Ce que c'est** : les métadonnées d'un côté, les charges de l'autre, avec une purge propre aux
  charges.
- **En faveur** : on garde longtemps ce qui est léger, et on se débarrasse de ce qui est lourd.
- **En défaveur** : une jointure et une migration de plus, pour un volume qui ne le justifie pas —
  quelques dizaines d'événements par semaine sur un seul dépôt.
- **Ce que ça ferme** : rien.

## Décision

**Une table unique `evenements`, la charge utile conservée entière, et une purge par âge.**

Le critère décisif est l'irréversibilité : l'option B est la seule qui interdise de répondre demain à
une question qu'on ne s'est pas posée aujourd'hui, et c'est exactement ce à quoi sert un historique.
L'option C résout un problème de volume que ce projet n'a pas.

### Le schéma

```sql
CREATE TABLE evenements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  livraison   TEXT    NOT NULL UNIQUE,  -- identifiant de livraison, rejette les doublons
  source      TEXT    NOT NULL,         -- 'github' ; 'claude-code' en tranche 6
  type        TEXT    NOT NULL,         -- push, issues, pull_request, workflow_run…
  action      TEXT,                     -- opened, closed, completed… quand l'événement en porte une
  depot       TEXT,
  auteur      TEXT,
  titre       TEXT,                     -- une ligne lisible, préparée à la réception
  url         TEXT,
  recu_le     TEXT    NOT NULL,         -- ISO 8601, heure du dashboard
  charge      TEXT    NOT NULL          -- le corps reçu, tel quel
);

CREATE INDEX evenements_recents ON evenements (recu_le DESC);
CREATE INDEX evenements_par_type ON evenements (type, recu_le DESC);

CREATE TABLE migrations (
  version    INTEGER PRIMARY KEY,
  appliquee_le TEXT NOT NULL
);
```

**`livraison UNIQUE` est le garde-fou central** : GitHub réessaie une livraison quand il n'obtient pas
de réponse, et c'est la base — non le code — qui garantit qu'un même événement n'entre qu'une fois.
Mesuré : la contrainte est bien appliquée par `node:sqlite`.

**Les migrations sont numérotées et appliquées dans l'ordre**, chacune dans une transaction, la
version notée à la fin. Une base absente est créée par la migration 1 : il n'y a pas de cas
« première fois » à part.

### La conservation

**Les événements sont conservés un an, et la purge s'exécute au démarrage puis une fois par jour.**

Un an couvre la question que cet historique sert à répondre — « qu'est-ce qui s'est passé sur ce
projet ? » — et reste négligeable en volume : à quelques dizaines d'événements par semaine, charges
comprises, l'ordre de grandeur est de quelques dizaines de mégaoctets. Une durée plus courte ferait
perdre la comparaison d'une année sur l'autre ; une conservation sans limite ferait grandir sans
raison une base que personne ne surveille.

Décision validée en séance le 2026-09-16 : table unique, charge conservée entière, et conservation
d'un an. Elle n'engage en rien la pile de cairn-wms.

## Conséquences

- **Ce qu'on peut faire** : afficher le fil, filtrer par type, et répondre plus tard à des questions
  non prévues, la charge étant conservée.
- **Ce qu'on ne peut plus faire** : confier à cette base autre chose que l'historique des événements —
  la fiche `0001` l'interdit déjà, le schéma le rappelle.
- **Ce qu'il faut mettre en place** : le module d'accès (fiche `0006`), les migrations, la purge, la
  vérification de la base dans `/health` — **lecture et écriture**, car un volume monté en lecture
  seule se voit sinon au premier webhook perdu ; tranche 5 (issue #5).
- **Ce qu'on accepte de payer** : une base qui contient des charges brutes plus volumineuses que ce
  qu'on affiche, et une purge à surveiller.
- **Ce qui la remettrait en cause** : un volume d'événements sans commune mesure avec celui d'un seul
  dépôt, ou le besoin de conserver au-delà d'un an.
