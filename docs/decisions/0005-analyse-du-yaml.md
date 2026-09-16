# 0005 — Analyse du YAML de cairn-wms

**Statut** : actée · **Date** : 2026-09-16 · **Remplace** : — · **Remplacée par** : —

## Contexte

La tranche 3 (`status.yml`, issue #3) doit afficher l'avancement de cairn-wms, lu dans son
`status.yml` sur la branche `dev`. Le fichier réel, relevé à la source : 4 609 octets, six couches,
vingt et un modules, et pour chacun un `id`, un `nom`, un `etat`, une `issue`, un `doc` parfois nul
et un `prefixe_regles`. Deux états seulement y sont employés aujourd'hui — `spécifié` et `à faire` —
mais l'en-tête du fichier en déclare quatre.

Il faut donc analyser du YAML. La fiche `0001` acte la pile et ne tranche rien là-dessus, et
`docs/decisions/README.md` range « une bibliothèque structurante » parmi ce qui mérite une fiche :
l'analyseur servira aussi aux tranches suivantes, dès que le dashboard lira un autre fichier de
configuration de cairn-wms.

**La contrainte de sécurité est la même qu'en `0004`** : le fichier vient d'un dépôt public, écrit
aussi par des sessions automatisées. Un analyseur YAML capable d'instancier des objets arbitraires à
partir de balises est une porte ouverte ; il faut savoir, et non supposer, ce que fait celui qu'on
retient.

Ce qui suit a été **vérifié dans le code des paquets**, pas supposé.

## Options

### Option A — `yaml` (eemeli)

- **Ce que c'est** : analyseur YAML 1.1 et 1.2, conforme à la suite de tests officielle. Version
  2.9.1, licence ISC. **Aucune dépendance externe** — son README l'affirme et l'arbre le confirme.
  Son schéma par défaut est `core`, vérifié dans `dist/schema/Schema.js` :
  `this.name = (typeof schema === 'string' && schema) || 'core'`. Le schéma `core` de YAML 1.2 ne
  connaît que les types de base — nul, booléen, entier, flottant, chaîne, liste, table — et
  n'instancie rien d'autre.
- **En faveur** : **il est déjà dans l'arbre de dépendances**, en 2.9.1, dédupliqué — le déclarer
  n'ajoute pas un octet à l'image. Zéro dépendance, 670 Ko, sûr par défaut.
- **En défaveur** : une dépendance directe de plus à suivre, là où elle n'était jusqu'ici qu'un
  détail d'un autre paquet.
- **Ce que ça ferme** : rien — l'analyse est isolée derrière un utilitaire serveur.

### Option B — `js-yaml`

- **Ce que c'est** : l'analyseur historique. Version 5.4.2, licence MIT. `safeLoad` n'existe plus
  depuis la v4 ; `load` emploie `CORE_SCHEMA` par défaut, vérifié dans son bundle. Il est donc sûr
  par défaut lui aussi.
- **En faveur** : le plus répandu, donc le mieux connu.
- **En défaveur** : 1 534 Ko, soit plus du double, et il tire `argparse` — une dépendance qui ne sert
  qu'à son exécutable en ligne de commande, dont le dashboard n'a aucun usage. La version présente
  dans l'arbre est une 4.x, différente : la déclarer ajouterait donc réellement du poids.
- **Ce que ça ferme** : rien non plus.

### Option C — Lire le fichier sans analyseur

- **Ce que c'est** : extraire les champs à coups d'expressions régulières, la structure du fichier
  étant très régulière.
- **En faveur** : aucune dépendance.
- **En défaveur** : **c'est supposer le format au lieu de le lire**, ce que la règle 1 interdit
  précisément. Un commentaire, une chaîne entre guillemets, une indentation modifiée, un champ
  ajouté par cairn-wms, et l'affichage devient faux **en silence** — le pire des échecs pour un
  tableau de bord, qui prétend justement dire où en est le projet.
- **Ce que ça ferme** : toute évolution du format de cairn-wms sans réécriture chez nous.

## Décision

**Le dashboard analyse le YAML avec `yaml` (eemeli), dans sa configuration par défaut.**

Le critère décisif est qu'il est **déjà là** : la bibliothèque figure dans l'arbre en 2.9.1,
dédupliquée, si bien que la déclarer ne change rien à ce qui est installé et déployé. À sûreté égale
avec l'option B — les deux emploient un schéma sans balises arbitraires —, on retient celle qui ne
coûte rien et ne traîne aucune dépendance.

L'option C est écartée pour une raison de fond : elle reviendrait à figer une supposition sur un
format dont cairn-wms reste maître, et à afficher faux sans que personne ne s'en aperçoive.

Décision validée en séance le 2026-09-16, sur les trois options ci-dessus. Elle n'engage en rien la
pile de cairn-wms.

## Conséquences

- **Ce qu'on peut faire** : lire le `status.yml` de cairn-wms tel qu'il est, et tout autre fichier
  YAML que les tranches suivantes auraient à lire.
- **Ce qu'on ne peut plus faire** : traiter un fichier illisible comme un avancement vide. Un fichier
  qu'on n'arrive pas à analyser, ou dont la forme ne correspond pas à ce qu'on attend, est signalé
  comme une erreur — jamais deviné (issue #3).
- **Ce qu'il faut mettre en place** : un utilitaire serveur unique qui analyse et **valide la forme**
  du suivi lu, avec ses tests ; tranche 3 (issue #3), qui passe en développement.
- **Ce qu'on accepte de payer** : une dépendance directe de plus au journal des mises à jour, alors
  qu'elle était jusqu'ici invisible.
- **Ce qui la remettrait en cause** : un changement de format chez cairn-wms qui sortirait du YAML,
  ou le besoin d'écrire du YAML — l'écriture n'est pas couverte par cette fiche.
