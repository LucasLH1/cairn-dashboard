# 0009 — Identité et rangement des événements de session

**Statut** : proposée · **Date** : 2026-09-16 · **Remplace** : — · **Remplacée par** : —

## Contexte

La fiche [`0007`](0007-historique-des-evenements.md) a acté le schéma de l'historique pour la
tranche 5, et y a prévu la tranche 6 : la colonne `source` vaut `'github'` aujourd'hui,
`'claude-code'` demain. Deux choses, découvertes en préparant la tranche 6, ne passent pas telles
quelles.

**Premièrement, aucun événement de hook ne porte d'identifiant de livraison.** Vérifié à la source le
2026-09-16 : les champs communs sont `session_id`, `prompt_id`, `transcript_path`, `cwd`,
`scratchpad_dir`, `permission_mode`, `effort` et `hook_event_name` ; s'y ajoutent `tool_use_id` sur
les événements d'outil et `agent_id` dans un sous-agent. Aucun identifiant propre à l'événement, et
rien qui ressemble au `X-GitHub-Delivery` sur lequel la tranche 5 repose. La documentation ne promet
d'ailleurs ni ordre ni réémission.

Or `livraison TEXT NOT NULL UNIQUE` est **la** protection de l'historique : la fiche `0007` a posé
que c'est la base, et non le code, qui garantit qu'un événement n'entre qu'une fois. Cette colonne
doit recevoir quelque chose, et ce quelque chose reste à décider.

**Deuxièmement, le fil doit regrouper les événements par session** (issue #6), et la table n'a
aucune colonne pour cela. `session_id` finirait dans la charge, d'où il faudrait l'extraire à chaque
lecture.

Un point qui semblait poser problème n'en pose pas : la fiche `0007` conserve « la charge entière »,
ce qui paraît contredire l'exigence de ne stocker que des métadonnées. Il n'en est rien — la fiche
[`0008`](0008-reception-des-evenements-de-session.md) fait **construire** le message par le poste, à
partir d'une liste blanche. La charge reçue ne contient donc que des métadonnées, et la conserver
entière reste juste. On ne change pas la règle de stockage : on borne ce que le poste émet.

## Options

### Option A — Un identifiant tiré au hasard à chaque envoi

- **Ce que c'est** : le script tire un identifiant aléatoire par message.
- **En faveur** : immédiat, aucune réflexion.
- **En défaveur** : **ne dédoublonne rien.** Un même événement envoyé deux fois — reprise du script,
  double déclaration héritée d'une configuration utilisateur et d'une configuration projet — produit
  deux identifiants, donc deux lignes. La contrainte `UNIQUE` existe alors sans rien garantir.
- **Ce que ça ferme** : toute protection contre le doublon, celle-là même que la tranche 5 a mesurée
  et prouvée.

### Option B — Une empreinte du contenu, calculée sur le poste

- **Ce que c'est** : la clé est l'empreinte SHA-256 de ce qui identifie l'événement — session,
  nom de l'événement, horodatage, et selon le cas `tool_use_id` ou `agent_id`.
- **En faveur** : un même événement réémis produit **la même clé**, que la contrainte `UNIQUE`
  rejette — exactement le comportement éprouvé en tranche 5 avec GitHub. La protection reste dans la
  base, pas dans le code.
- **En défaveur** : deux événements réellement distincts mais identiques sur tous ces champs
  seraient confondus. `tool_use_id` distingue les appels d'outil, et l'horodatage à la milliseconde
  distingue le reste : le cas demande deux événements de même nature, dans la même session, à la même
  milliseconde.
- **Ce que ça ferme** : rien.

### Option C — Attendre un identifiant fourni par Claude Code

- **Ce que c'est** : utiliser un champ d'identité fourni par l'émetteur, comme pour GitHub.
- **En faveur** : ce serait le plus juste — l'émetteur sait ce qu'il renvoie.
- **En défaveur** : **ce champ n'existe pas.** Option écartée par les faits, pas par jugement.
- **Ce que ça ferme** : sans objet.

## Décision

**La clé de déduplication est une empreinte du contenu, calculée sur le poste, et l'historique gagne
une colonne `session`.**

Le critère décisif est la **continuité du garde-fou** : la tranche 5 a établi, et mesuré, que
l'unicité est garantie par la base. Une clé aléatoire (option A) conserverait la contrainte en la
vidant de son sens — le pire des deux mondes, puisque rien n'échouerait jamais visiblement. L'option
C est écartée par un fait vérifié, non par préférence.

### La clé

```
cle = SHA-256( session_id | hook_event_name | horodatage | tool_use_id ou agent_id ou "" )
```

Calculée sur le poste et envoyée dans le message, elle prend place dans la colonne `livraison`
existante, dont c'est déjà le rôle : rejeter ce qui est déjà connu. La colonne ne change ni de nom ni
de contrainte.

### Le schéma

Une migration 2, appliquée comme la première — dans une transaction, version notée à la fin :

```sql
ALTER TABLE evenements ADD COLUMN session TEXT;
CREATE INDEX evenements_par_session ON evenements (session, recu_le DESC);
```

`session` est **nul pour les événements GitHub**, qui n'en ont pas. Ajouter une colonne nullable
n'exige aucune réécriture des lignes existantes : l'historique déjà reçu est préservé tel quel, ce
qui sera vérifié au déploiement en comptant les événements avant et après la fusion.

La conservation reste celle de la fiche `0007` : **un an**, pour cette source comme pour l'autre. Une
durée propre aux sessions compliquerait la purge sans rien apporter.

## Conséquences

- **Ce qu'on peut faire** : regrouper le fil par session sans lire la charge ; rejeter un événement
  réémis ; conserver l'historique GitHub intact à travers la migration.
- **Ce qu'on ne peut plus faire** : se fier à un identifiant fourni par Claude Code, tant qu'il
  n'existe pas ; stocker autre chose que des métadonnées pour cette source, la fiche `0008` bornant
  ce qui est émis.
- **Ce qu'il faut mettre en place** (tranche 6, issue #6) : la migration 2 et son index ; le calcul
  de la clé dans le script d'envoi ; la vérification, au déploiement, que l'historique survit — un
  comptage juste avant la fusion et juste après la mise en ligne, qui éprouvera du même coup le
  volume déclaré en tranche 5, jamais encore soumis à un redéploiement.
- **Ce qu'on accepte de payer** : une clé fabriquée plutôt que reçue, donc une déduplication qui vaut
  ce que vaut l'horodatage du poste ; et une colonne nulle pour la moitié des lignes.
- **Ce qui la remettrait en cause** : l'apparition d'un identifiant d'événement dans les hooks Claude
  Code, qui rendrait la clé fabriquée inutile ; ou un besoin de conserver les sessions plus
  longtemps que les événements GitHub.
