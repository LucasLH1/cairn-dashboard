---
date: 2026-09-15 23:17
objectif: Préparer le serveur à héberger le dashboard sur monitoring.cairn-wms.fr — inventaire, plan de mise au propre, exécution.
tranches: ["1a"]
issues: [1]
---

# Session du 2026-09-15 — préparation du VPS

## Objectif

Préparer le serveur à héberger cairn-dashboard sur monitoring.cairn-wms.fr, en trois temps :

1. un inventaire en lecture seule ;
2. un plan de mise au propre, arbitré point par point ;
3. l'exécution de ce plan, dans l'ordre arrêté.

Coolify ne devait pas être réinstallé.

## Actions

- Inventorié le serveur en lecture seule : système, accès, pare-feu, Coolify, Docker, applications
  et domaines. Aucune modification, aucun secret affiché.
- Conservé l'inventaire détaillé **hors du dépôt**, sur le poste de travail : le dépôt est public, et
  cet inventaire décrit l'exposition du serveur. Cette entrée n'en garde qu'un résumé.
- Proposé un plan de mise au propre, action par action avec son risque, arbitré ensuite point par
  point.

### Étape 1 — sécurité et nettoyage

- Ouvert une connexion SSH maîtresse persistante avant toute modification, pour garder la main en
  cas d'erreur de configuration. Chaque fichier modifié a d'abord été copié sur le serveur, pour
  permettre un retour arrière.
- Complété les règles du pare-feu pour le trafic destiné aux conteneurs, en IPv4 et IPv6, et rendu
  ces règles persistantes. Le test de syntaxe préalable n'a pas pu tourner, faute de droits en
  lecture ; le rechargement du pare-feu a chargé les fichiers sans erreur, ce qui en valide la
  syntaxe.
- Retiré du proxy une publication inutile, puis recréé le proxy : il était sain en quelques
  secondes et les certificats sont restés servis.
- Installé fail2ban pour SSH, en exemptant les réseaux internes par lesquels Coolify joint le
  serveur. Son filtre a été éprouvé sur l'historique du journal.
- Durci la configuration de SSH, validée avant rechargement, et empêché cloud-init de la rétablir.
  Une nouvelle connexion a été vérifiée après coup.
- Verrouillé le compte de service inutilisé, de façon réversible.
- Supprimé deux volumes vides et un fichier résiduel.
- Vérifié depuis l'extérieur, après les changements de pare-feu puis après la recréation du proxy,
  que seuls les accès attendus répondent, et que Coolify et l'environnement de staging restent
  servis.

Aucune interruption de service, hormis quelques secondes pendant la recréation du proxy.

## Décisions

Arbitrages validés en séance :

- **Ancien staging retiré** : l'application héritée de l'ancien Cairn, sa base et ses volumes sont
  supprimés, sans sauvegarde, les données étant sans valeur. Le jeton d'API de l'ancien pipeline est
  révoqué. L'enregistrement DNS `staging` est conservé : il resservira.
- **Sauvegardes hors serveur** : décision reportée, le coût restant à valider. Seule exception : une
  sauvegarde manuelle de la base de Coolify, copiée sur le poste de travail avec vérification
  d'intégrité, avant sa mise à jour.
- **Sécurité** : mesures sur l'accès SSH et le pare-feu, qui doivent tenir après redémarrage et
  après mise à jour de Coolify. Le compte de service inutilisé est verrouillé, puis supprimé en fin
  de mise au propre si rien n'a cassé. Le dernier réglage, sur la connexion de Coolify au serveur,
  vient en tout dernier, avec retour arrière prêt.
- **Mises à jour** : système et Docker dans une même fenêtre avec redémarrage, puis Coolify par sa
  mise à jour intégrée. Sa mise à jour automatique reste désactivée. Pas d'Ubuntu Pro : les mises à
  jour de sécurité automatiques sont vérifiées à la place.
- **Ajouts et nettoyage** : ajout d'un swap ; suppression des volumes orphelins et d'un fichier
  résiduel. Les images inutilisées restent au nettoyage automatique de Coolify.
- **Dashboard** : pas d'enregistrement AAAA tant que l'IPv6 entrante n'est pas vérifiée. Création
  dans Coolify du projet `cairn-dashboard`, environnement `production`, domaine
  `https://monitoring.cairn-wms.fr`, port 3000, sans déployer. Le jeton d'API du dashboard est créé
  par Lucas. L'image du dashboard sera publique.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `journal/2026-09-15-2317-preparation-du-vps.md` | Créé. La présente entrée, résumée : le détail reste hors du dépôt. |

`status.yml` est inchangé.

## Issues liées

- `#1` — à mettre à jour :
  - l'image du dashboard sera rendue publique, ce qui écarte l'option d'un identifiant de registre ;
  - les droits du jeton Coolify sont confirmés : `deploy` et `write`.

## Points ouverts

- Étapes 2 à 8 du plan à mener, puis à consigner dans cette entrée.
- Archiver l'ancien dépôt de Cairn sur GitHub.
- Chiffrer le coût des sauvegardes hors serveur.
- Vérifier l'IPv6 entrante depuis un poste IPv6.
