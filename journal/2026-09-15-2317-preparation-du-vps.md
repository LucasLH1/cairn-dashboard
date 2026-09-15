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

### Étape 2 — retrait de l'ancien staging

- **Côté Lucas** : dépôt de l'ancien Cairn archivé sur GitHub ; dans Coolify, application, base et
  environnement du staging supprimés ; ancien jeton d'API révoqué.
- **Sur le serveur** : vérifié qu'il ne reste rien du staging, ni conteneur, ni volume, ni image, ni
  dossier de configuration, ni trace dans le proxy. Aucun élément n'a survécu à la suppression faite
  dans Coolify.
- **Dans Coolify** : plus aucune application, aucun service, aucun projet, aucun jeton d'API, aucun
  rattachement orphelin. Seule demeure la sauvegarde planifiée de sa propre base.
- **Ancienne génération de la base de staging** : supprimée, sans sauvegarde, comme décidé. Elle était
  déjà orpheline avant la suppression.
- **Depuis l'extérieur** : staging.cairn-wms.fr ne sert plus l'ancienne application, le proxy
  indiquant qu'aucun service n'est disponible, et son enregistrement DNS est conservé. Coolify
  répond, et les accès fermés à l'étape 1 le restent.

### Étape 3 — mises à jour du système et de Docker, redémarrage

- **Mises à jour** : rafraîchi la liste des paquets, qui en comptait davantage qu'à l'inventaire, tous
  des mises à jour ordinaires d'Ubuntu et de Docker. Installé tout ce qui était en attente, en
  conservant les fichiers de configuration locaux, sans erreur. Le démon Docker a redémarré pendant
  sa mise à jour : les conteneurs de Coolify sont revenus sains en une vingtaine de secondes, et les
  règles de pare-feu des conteneurs ont tenu.
- **Redémarrage** : le serveur a redémarré pour charger le nouveau noyau, et il était de retour en une
  trentaine de secondes.
- **Sur le serveur, après le redémarrage** :
  - nouveau noyau chargé, aucun service en échec ;
  - réseau opérationnel en IPv4 et IPv6 ;
  - conteneurs de Coolify sains ;
  - pare-feu et règles des conteneurs rechargés depuis leur configuration, ce qui prouve leur
    persistance ;
  - fail2ban actif, configuration SSH et verrouillage du compte de service conservés.
- **Depuis l'extérieur** : seuls les accès attendus répondent. Coolify répond, et les domaines non
  routés renvoient la réponse par défaut du proxy.
- **Fausse alerte écartée** : un contrôle a d'abord affiché zéro règle de pare-feu. C'était une erreur
  de filtre sur le format de sortie, écartée par une lecture détaillée.

Interruption de service : une vingtaine de secondes au redémarrage de Docker, puis une trentaine au
redémarrage du serveur.

### Étape 4 — sauvegarde de Coolify, puis mise à jour

- **Sauvegarde** : sauvegardé la base de Coolify ainsi que son fichier de configuration, qui porte sa
  clé de chiffrement, et copié les deux sur le poste de travail, dans un dossier réservé, hors de tout
  dépôt. Leur contenu n'a jamais été affiché.
- **Intégrité** : les empreintes sont identiques entre le serveur et le poste ; la table des matières
  est relue et la sauvegarde lue en entier, sans erreur, sur les deux exemplaires. Une première
  relecture s'est interrompue sur une erreur technique du script, et elle a été refaite.
- **Mise à jour** : lancée par Lucas depuis l'interface de Coolify.
- **Sur le serveur, après la mise à jour** :
  - services de Coolify sains et à la version attendue ;
  - aucune erreur dans le journal de mise à jour, aucune migration en attente, réponse de santé
    correcte ;
  - configuration du proxy inchangée, pare-feu intact, mise à jour automatique toujours désactivée.
- **Depuis l'extérieur** : seuls les accès attendus répondent.
- **Clé de chiffrement** : la mise à jour a modifié le fichier de configuration de Coolify, mais sa
  clé de chiffrement est restée la même. La sauvegarde reste donc restaurable.

### Étape 5 — swap, mises à jour automatiques, droits d'un fichier sensible

- **Swap** : ajouté un swap, déclaré pour tenir au redémarrage. La configuration des montages a été
  vérifiée sans erreur.
- **Mises à jour de sécurité automatiques** : vérifié qu'elles sont actives et réellement appliquées
  depuis plusieurs semaines. Rien n'était à activer.
- **Redémarrage automatique** : mis en place la nuit, à heure fixe de Paris, et seulement quand une
  mise à jour l'exige.
  - Le serveur reste en temps universel. Le réglage natif aurait suivi ce fuseau et se serait décalé
    d'une heure au changement d'heure : une minuterie système dédiée s'en charge.
  - Le cas « non requis » a été testé : aucun redémarrage.
- **Droits du fichier de configuration sensible de Coolify** : lu d'abord ses scripts d'installation et
  de mise à jour, puis aligné les droits du fichier et de ses copies sur la convention de Coolify.
  Cette convention est au moins aussi sûre que celle envisagée au départ.
- **Mise à l'épreuve, par des redémarrages de Coolify** :
  - La première a déclenché le retour arrière prévu. Un contrôle trop précoce n'avait pas trouvé les
    tâches d'arrière-plan, encore en démarrage.
  - Après diagnostic, la seconde, avec une attente correcte, a réussi : services sains, tâches
    d'arrière-plan relancées, configuration rechargée, aucune erreur.
- **Consigne** : la mise à jour de Coolify réécrit ce fichier. Ses droits sont donc à revérifier après
  chaque mise à jour, et la consigne est notée dans l'archive privée.
- **Depuis l'extérieur** : seuls les accès attendus répondent, et Coolify répond.

Interruption de service : l'interface de Coolify a été indisponible une vingtaine de secondes à chacun
des trois redémarrages.

### Étape 6 — suppression du compte de service inutilisé

- **Avant la suppression** : vérifié que le compte n'avait ni processus, ni session, ni tâche
  planifiée, ni droit d'administration, ni fichier hors de son dossier personnel.
- **Suppression** : supprimé le compte et son dossier personnel, sans sauvegarde, comme décidé.
- **Après la suppression** : il ne reste de lui ni compte, ni groupe, ni dossier, ni processus, ni
  tâche planifiée, ni aucun fichier sur le système. Les seuls fichiers portant le même identifiant
  numérique sont dans les images de conteneurs : ils leur appartiennent et n'ont pas de lien avec ce
  compte.
- **SSH** : la configuration est valide et une nouvelle connexion est acceptée. La protection contre
  les tentatives répétées est active et a déjà écarté une adresse, qui n'est pas celle de
  l'administration.
- **Coolify** : services sains, tâches d'arrière-plan en marche, serveur joignable.
- **Depuis l'extérieur** : seuls les accès attendus répondent.

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

- Étapes 7 et 8 du plan à mener, puis à consigner dans cette entrée.
- Aucun jeton d'API Coolify n'existe plus : celui du dashboard reste à créer par Lucas.
- Chiffrer le coût des sauvegardes hors serveur.
- Vérifier l'IPv6 entrante depuis un poste IPv6.
