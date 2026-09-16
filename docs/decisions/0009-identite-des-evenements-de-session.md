# 0009 — Identité et rangement des événements de session

**Statut** : actée · **Date** : 2026-09-16 · **Remplace** : — · **Remplacée par** : —

> **Amendée le 2026-09-16**, avant validation, sur objection : la première rédaction proposait une
> empreinte du contenu seule. Elle transposait le cas GitHub sans en vérifier la prémisse. Voir
> « Ce que la première rédaction avait manqué ».

## Contexte

La fiche [`0007`](0007-historique-des-evenements.md) a acté le schéma de l'historique pour la
tranche 5, et y a prévu la tranche 6 : la colonne `source` vaut `'github'` aujourd'hui,
`'claude-code'` demain. Deux choses, découvertes en préparant la tranche 6, ne passent pas telles
quelles.

**Premièrement, la colonne `livraison TEXT NOT NULL UNIQUE` doit recevoir quelque chose.** C'est
**la** protection de l'historique : la fiche `0007` a posé que c'est la base, et non le code, qui
garantit qu'un événement n'entre qu'une fois. Or les événements de hooks n'apportent pas tous un
identifiant.

**Deuxièmement, le fil doit regrouper les événements par session** (issue #6), et la table n'a aucune
colonne pour cela. `session_id` finirait dans la charge, d'où il faudrait l'extraire à chaque lecture.

Un point qui semblait poser problème n'en pose pas : la fiche `0007` conserve « la charge entière »,
ce qui paraît contredire l'exigence de ne stocker que des métadonnées. Il n'en est rien — la fiche
[`0008`](0008-reception-des-evenements-de-session.md) fait **construire** le message par le poste, à
partir d'une liste blanche. La charge reçue ne contient donc que des métadonnées, et la conserver
entière reste juste. On ne change pas la règle de stockage : on borne ce que le poste émet.

### Ce que la première rédaction avait manqué

Elle raisonnait par analogie avec GitHub, où la clé sert à **rejeter un renvoi** : GitHub réémet une
livraison quand il n'obtient pas de réponse, et la tranche 5 l'a mesuré. **Les hooks Claude Code ne
renvoient rien.** La documentation ne promet ni réémission, ni ordre, ni accusé de réception, et un
hook asynchrone (fiche `0008`) n'a même pas de canal de retour.

Le danger n'est donc pas le doublon : **c'est la perte**. Une clé trop grossière ferait disparaître
en silence un événement bien réel — deux modifications du même fichier dans la même seconde, par
exemple — et l'historique mentirait sans que rien n'échoue. Le critère n'est pas la stabilité de la
clé, c'est son **pouvoir de distinction**.

### Les identifiants réellement disponibles, relevés à la source le 2026-09-16

| Événement retenu | Identifiant propre à l'appel |
|---|---|
| `PostToolUse` | **`tool_use_id`**, documenté dans son schéma d'entrée |
| `SessionStart` | aucun |
| `SessionEnd` | aucun |
| `Stop` | aucun — son exemple d'entrée ne porte même pas `prompt_id` |

`tool_use_id` accompagne aussi `PreToolUse`, `PostToolUseFailure` et `PermissionDenied` ;
`PermissionRequest` en est explicitement dépourvu. Aucun de ces événements n'est retenu par la fiche
`0008`, mais le relevé montre que le champ est bien attaché à l'appel d'outil, et non à l'événement.

## Options

### Option A — Une empreinte du contenu, sans plus

- **Ce que c'est** : la clé est l'empreinte de la session, du nom de l'événement et de l'horodatage.
- **En faveur** : aucun état à tenir sur le poste, calcul immédiat.
- **En défaveur** : **confond deux événements réellement distincts** quand ils tombent dans la même
  seconde — deux écritures successives du même fichier, cas courant. La perte est silencieuse : la
  contrainte `UNIQUE` fait son travail, et c'est justement le problème.
- **Ce que ça ferme** : la fidélité de l'historique, sans que rien ne le signale.

### Option B — L'identifiant d'appel quand il existe, une empreinte distinctive sinon

- **Ce que c'est** : `tool_use_id` pour les événements d'outil, qui en portent un ; pour les trois
  événements de session, qui n'en ont pas, une empreinte incluant l'horodatage **à la milliseconde**
  et un **compteur propre à la session**.
- **En faveur** : chaque événement d'outil est identifié par ce qui l'identifie déjà chez l'émetteur ;
  les autres le sont par une clé qu'aucun autre événement ne peut produire.
- **En défaveur** : le compteur demande au script de tenir un petit état par session.
- **Ce que ça ferme** : rien.

### Option C — Un identifiant tiré au hasard à chaque envoi

- **Ce que c'est** : le script tire un identifiant aléatoire par message.
- **En faveur** : distinction parfaite, aucun état, et comme les hooks ne renvoient rien, aucun
  doublon à craindre.
- **En défaveur** : la colonne `livraison` deviendrait décorative. Le jour où un envoi serait rejoué
  — reprise manuelle, double déclaration héritée de deux fichiers de réglages — rien ne le
  rattraperait, et la garantie posée par la fiche `0007` ne vaudrait plus que pour une source sur
  deux.
- **Ce que ça ferme** : toute protection résiduelle contre un envoi rejoué.

## Décision

**La clé est l'identifiant d'appel quand l'événement en porte un, et sinon une empreinte incluant
l'horodatage à la milliseconde et un compteur propre à la session.**

```
PostToolUse                      cle = "claude-code:" + tool_use_id
SessionStart, SessionEnd, Stop   cle = "claude-code:" + SHA-256(
                                         session_id | hook_event_name |
                                         horodatage à la milliseconde | compteur )
```

Le critère décisif est la **distinction** : l'option A perd des événements réels sans rien signaler,
ce qu'un historique ne peut pas se permettre. L'option C distingue parfaitement mais vide la
contrainte `UNIQUE` de son sens pour cette source ; l'option B la conserve utile là où c'est
possible, sans jamais confondre.

Le préfixe `claude-code:` rend la clé lisible et écarte d'emblée toute collision avec un identifiant
de livraison GitHub, la colonne étant partagée par les deux sources.

**Le compteur n'a pas besoin de verrou.** Les trois événements qui l'emploient ne sont jamais
concurrents : une session commence une fois, se termine une fois, et `Stop` ne se déclenche qu'à la
fin d'une réponse. Les seuls événements réellement parallèles sont ceux d'outil — et ceux-là prennent
la première branche, celle de `tool_use_id`. Si `tool_use_id` venait à manquer sur un `PostToolUse`,
la seconde branche s'applique : on ne suppose pas sa présence.

Décision amendée sur objection avant validation : la première rédaction proposait l'option A.

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

- **Ce qu'on peut faire** : regrouper le fil par session sans lire la charge ; conserver chaque
  événement distinct, y compris deux modifications du même fichier dans la même seconde ; conserver
  l'historique GitHub intact à travers la migration.
- **Ce qu'on ne peut plus faire** : se fier à un identifiant fourni pour les événements de session,
  tant qu'il n'existe pas ; stocker autre chose que des métadonnées pour cette source, la fiche
  `0008` bornant ce qui est émis.
- **Ce qu'il faut mettre en place** (tranche 6, issue #6) : la migration 2 et son index ; le calcul
  de la clé et le compteur de session dans le script d'envoi ; un test qui **éprouve la
  distinction** — deux événements de même nature dans la même milliseconde doivent produire deux
  lignes, et non une ; la vérification, au déploiement, que l'historique survit, par un comptage
  juste avant la fusion et juste après la mise en ligne.
- **Ce qu'on accepte de payer** : un petit état par session sur le poste, à purger ; et une clé qui,
  pour les événements de session, vaut ce que vaut l'horloge du poste.
- **Ce qui la remettrait en cause** : l'apparition d'un identifiant d'événement dans les hooks Claude
  Code, qui rendrait l'empreinte inutile ; ou un besoin de conserver les sessions plus longtemps que
  les événements GitHub.
