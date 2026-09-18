# Décisions

Ce dossier conserve les **décisions engageantes** du dashboard : celles qu'on ne peut pas revenir
défaire à bon compte, et dont quelqu'un — dans six mois, ou six ans — voudra connaître la raison.

## Décisions actées

| N° | Titre | Ce qu'elle tranche |
|---|---|---|
| [0001](0001-pile-du-dashboard.md) | Pile du dashboard | Langage, framework, persistance, accès à GitHub, connecteur MCP, contrôle d'accès. |
| [0002](0002-hebergement-sur-coolify.md) | Hébergement sur Coolify | Où et par quoi le dashboard est mis en service. |
| [0003](0003-dashboard-un-seul-environnement.md) | Dashboard : un seul environnement, production | Combien d'environnements, et ce qui déclenche la mise en production. |
| [0004](0004-rendu-du-markdown.md) | Rendu du Markdown de cairn-wms | Avec quoi la documentation est rendue en HTML, et comment le HTML brut est neutralisé. |
| [0005](0005-analyse-du-yaml.md) | Analyse du YAML de cairn-wms | Avec quoi le suivi de cairn-wms est lu, et pourquoi on ne suppose pas son format. |
| [0006](0006-bibliotheque-sqlite.md) | Bibliothèque d'accès à SQLite | Par quoi le dashboard écrit sa seule donnée propre, et ce que le choix impose au `Dockerfile`. |
| [0007](0007-historique-des-evenements.md) | Historique des événements | Le schéma de l'historique, et combien de temps il est conservé. |
| [0008](0008-reception-des-evenements-de-session.md) | Réception des événements des sessions Claude Code | Par quel mécanisme les sessions alimentent le fil, ce qu'elles en disent et ce qu'elles taisent. |
| [0009](0009-identite-des-evenements-de-session.md) | Identité et rangement des événements de session | Ce qui distingue deux événements de session, et comment le fil les regroupe. |
| [0010](0010-developpement-local-sur-donnees-fictives.md) | Développement local sur données fictives | Comment voir l'interface changer sur le poste, sans GitHub ni secret, et sans rien ouvrir en production. |

Ces décisions n'engagent que le dashboard. Elles ne tranchent rien pour cairn-wms, dont les choix se
font dans son propre dépôt — et réciproquement.

## La règle

> **Ce qui n'est pas écrit ici n'est pas décidé.**

Un choix absent de ce dossier ne doit jamais être supposé, ni déduit d'un fichier existant, ni
imposé par un raccourci de mise en œuvre. Face à un choix engageant non tranché : on écrit une
fiche et on la fait valider — on ne code pas d'abord.

## Ce qui mérite une fiche

Une décision dont on ne peut pas sortir sans coût mérite une fiche. Concrètement :

- un choix de technologie (langage, framework, base de données, hébergement, outillage) ;
- une bibliothèque structurante : une dépendance qu'on ne pourrait plus retirer sans réécrire ;
- une frontière d'architecture (ce qui est un module, ce qui est un service, ce qui parle à quoi) ;
- un schéma de données, à commencer par celui de la base SQLite ;
- une extension du périmètre ou un assouplissement d'un principe de `docs/cadrage.md` : une
  écriture de plus, un accès élargi ;
- un renoncement : ce qu'on décide explicitement de **ne pas** faire.

Ce qui n'en mérite pas : le nommage d'une variable, l'ordre de deux fonctions, tout ce qu'un
`git revert` suffit à annuler.

## Forme

Un fichier par décision, jamais deux décisions dans le même fichier.

**Nom du fichier** : `NNNN-titre-court.md`, numérotation continue à partir de `0001`, en minuscules
et tirets. Exemple : `0001-pile-du-dashboard.md`.

**Un numéro n'est jamais réutilisé.** Si une décision est abandonnée, sa fiche reste en place, son
statut passe à *remplacée* ou *abandonnée*, et la suivante prend le numéro d'après.

**Statuts** :

| Statut | Sens |
|---|---|
| `proposée` | Écrite, pas encore validée. N'engage personne, ne doit pas être mise en œuvre. |
| `actée` | Validée. Fait autorité. |
| `remplacée par NNNN` | Une décision plus récente a pris le relais. La fiche reste, pour l'histoire. |
| `abandonnée` | Le sujet ne se pose plus. La fiche reste, pour la même raison. |

**On ne réécrit pas une fiche actée.** Si la décision change, on en écrit une nouvelle qui remplace
l'ancienne. L'historique doit rester lisible : ce qu'on savait au moment de trancher compte autant
que ce qu'on a tranché.

## Écrire une fiche

Copier `modele.md`, le renommer, le remplir. Le modèle est volontairement court : quatre sections,
dont aucune n'est facultative.

Une fiche utile se reconnaît à sa section **Options** : si elle n'en contient qu'une, ce n'était pas
une décision, c'était une constatation. Les options écartées valent autant que celle retenue — elles
évitent de rouvrir six mois plus tard un débat déjà tenu.

## Lien avec le reste du dépôt

- Le **cadrage** (`docs/cadrage.md`) dit à quoi sert le dashboard, ce qu'il couvre et les principes
  qu'il respecte.
- La **logique de déploiement** (`docs/deploiement.md`) décrit comment une application est
  construite, éprouvée et mise en service. Les choix engageants qu'elle contient pour le dashboard
  sont actés ici.
- Les **décisions** (ici) disent comment on s'y prend, et pourquoi.
- **`status.yml`** dit où en est chaque tranche. Une fiche qui en touche une le mentionne dans ses
  conséquences.
- Le **journal** (`journal/`) dit ce qui s'est passé, session après session. Une décision prise en
  session est mentionnée dans l'entrée du jour **et** fait l'objet d'une fiche ici : le journal
  raconte, la fiche fait foi.
