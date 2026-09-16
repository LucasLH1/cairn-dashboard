# 0002 — Hébergement sur Coolify

**Statut** : actée · **Date** : 2026-09-15 · **Remplace** : — · **Remplacée par** : —

## Contexte

La tranche 1 met le dashboard en ligne, sur le VPS. Il faut décider ce qui, sur ce serveur, reçoit
l'image construite en intégration et la met en service.

Le point de départ est décrit dans [`docs/deploiement.md`](../deploiement.md) : Coolify est déjà
installé sur le VPS, et les anciens workflows de Cairn l'utilisaient déjà, par son API, pour
mettre à jour l'étiquette d'image d'une application et la déployer (§1). Le serveur doit accueillir
plusieurs applications ; il en faut, pour chacune (§4) :

- un sous-domaine et un certificat TLS ;
- des variables d'environnement et des volumes persistants ;
- une API pour mettre à jour l'image et déployer ;
- une interface pour voir l'état et les journaux.

Le dashboard y ajoute ses propres besoins : ses secrets vivent en variables d'environnement
([cadrage](../cadrage.md), principe 3), sa base SQLite doit survivre aux déploiements (§5), et chaque
déploiement désigne un SHA déjà construit et éprouvé, sans reconstruction (§2, principe 4).

## Options

### Option A — Coolify, conservé

- **Ce que c'est** : la plateforme déjà installée sur le VPS, avec interface et API.
- **En faveur** : couvre les quatre besoins ; son API de mise à jour d'image et de déploiement a
  déjà servi ; rien à migrer.
- **En défaveur** : un produit tiers se tient sur le chemin de chaque mise en service ; un jeton
  d'API par environnement à détenir et à renouveler.
- **Ce que ça ferme** : rien de durable. Une image étiquetée par son SHA se déploie ailleurs sans
  être reconstruite.

### Option B — Dokploy

- **Ce que c'est** : une plateforme très proche de Coolify.
- **En faveur** : couvre les mêmes besoins.
- **En défaveur** : n'apporte rien de décisif, et impose de migrer ce qui tourne déjà.
- **Ce que ça ferme** : rien de plus que Coolify.

### Option C — Kamal

- **Ce que c'est** : un outil de déploiement de conteneurs, piloté en ligne de commande.
- **En faveur** : pas de plateforme intermédiaire à faire vivre sur le serveur.
- **En défaveur** : pas d'interface ; l'état et les journaux ne se consultent plus en un seul
  endroit.
- **Ce que ça ferme** : la consultation de l'état et des journaux par une interface, sauf à la
  reconstruire.

### Option D — Docker Compose et un reverse proxy

- **Ce que c'est** : sous-domaines, certificats, variables et volumes configurés à la main.
- **En faveur** : aucun produit tiers.
- **En défaveur** : tout est à faire et à maintenir, sans API de déploiement ni interface.
- **Ce que ça ferme** : rien, au prix d'un travail d'exploitation permanent.

## Décision

**Le dashboard est hébergé sur Coolify, déjà installé sur le VPS.**

Le critère décisif : Coolify couvre les quatre besoins, il est en place, et son API de déploiement a
déjà servi. Les alternatives n'apportent rien de décisif ; en changer coûterait une migration sans
gain.

Décision validée en séance le 2026-09-15. Elle porte sur la mise en service du dashboard ; celle de
cairn-wms se décide dans son propre dépôt, même si le serveur est commun.

## Conséquences

- **Ce qu'on peut faire** : servir le dashboard sur son sous-domaine, monitoring.cairn-wms.fr, avec
  certificat ; lui fournir ses secrets en variables d'environnement ; garder sa base SQLite sur un
  volume persistant ; le déployer par API en désignant une image par son SHA.
- **Ce qu'on ne peut plus faire** : mettre le dashboard en service par un autre mécanisme sans
  nouvelle fiche.
- **Ce qu'il faut mettre en place** (tranche 1) :
  - l'application Coolify du dashboard, son sous-domaine et son certificat ;
  - les secrets de l'environnement GitHub `production` : `COOLIFY_URL`, `COOLIFY_TOKEN`,
    `COOLIFY_APP_UUID`, `APP_URL` (§3) ;
  - le workflow `deploiement.yml` qui les consomme.

  Le volume persistant de la base SQLite vient avec la tranche 5, qui introduit la base.
- **Ce qu'on accepte de payer** : la dépendance à un produit tiers pour chaque mise en service ; un
  jeton d'API Coolify dont l'échéance doit être suivie ; un seul serveur pour tout.
- **Ce qui la remettrait en cause** : le besoin de dépasser un seul serveur ; une API de
  déploiement retirée ou modifiée de façon incompatible ; un besoin d'exploitation que Coolify ne
  couvre pas.
