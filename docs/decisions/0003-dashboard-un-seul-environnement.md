# 0003 — Dashboard : un seul environnement, production

**Statut** : actée · **Date** : 2026-09-15 · **Remplace** : — · **Remplacée par** : —

## Contexte

Le dashboard est servi à l'adresse monitoring.cairn-wms.fr, hébergé sur Coolify
([`0002`](0002-hebergement-sur-coolify.md)). Il faut décider combien d'environnements il possède :
de ce nombre dépendent le chemin d'une version jusqu'à la production et le nombre de contrôles
humains en route.

Le modèle de [`docs/deploiement.md`](../deploiement.md) fixe le cadre :

- on promeut **un SHA**, pas une branche : pas de branche `staging`, et `main` reflète ce qui est
  en production (§3) ;
- chaque image est éprouvée avant publication — démarrage réel, `/version`, `/health` à 200 puis à
  503 une dépendance coupée (§1) ;
- `deploiement.yml` reçoit un environnement et un SHA, s'appuie sur les environnements GitHub, et
  `production` exige une validation manuelle quand le projet a plusieurs environnements (§3) ;
- cairn-wms aura, lui, `staging` et `production`, déployés depuis le dashboard (§5).

`main` est protégée : on n'y entre que par pull request, administrateur compris.

## Options

### Option A — Un seul environnement : production

- **Ce que c'est** : la fusion de la pull request `dev` → `main` déclenche `deploiement.yml` vers
  `production`, sans validation manuelle supplémentaire.
- **En faveur** :
  - le contrôle humain existe déjà : c'est la pull request vers `main`, sans laquelle rien n'atteint
    la production ;
  - un seul environnement à créer et à tenir ;
  - l'image déployée a été éprouvée en intégration avant publication.
- **En défaveur** : aucun essai dans un environnement réel avant la production ; une régression qui
  échappe aux contrôles d'intégration se découvre en production.
- **Ce que ça ferme** : l'essai d'une version du dashboard en conditions réelles avant sa mise en
  service.

### Option B — Deux environnements : staging et production

- **Ce que c'est** : le modèle prévu pour cairn-wms. Un SHA est déployé en `staging`, puis promu en
  `production` avec la validation manuelle qu'impose §3.
- **En faveur** : un palier d'essai en conditions réelles ; le dashboard suivrait lui-même le
  parcours qu'il pilote pour cairn-wms.
- **En défaveur** :
  - un second environnement complet : application Coolify, sous-domaine, certificat, secrets, volume
    pour SQLite ;
  - une seconde instance du dashboard, avec sa propre configuration de connexion GitHub, d'OAuth et
    de webhooks ;
  - une validation manuelle qui s'ajoute à la pull request, pour un même geste de mise en service.
- **Ce que ça ferme** : rien, mais chaque mise en service coûte une étape de plus.

## Décision

**Le dashboard n'a qu'un environnement : la production.** La fusion de la pull request `dev` →
`main` le déploie, sans validation manuelle supplémentaire.

Le critère décisif : **la pull request en tient lieu**. Le contrôle humain avant la production
existe déjà, sur une branche protégée sans exception ; un palier `staging` ajouterait une seconde
validation du même geste et un second environnement complet à tenir, pour un outil dont chaque
image est déjà éprouvée avant publication.

Décision validée en séance le 2026-09-15. Elle ne vaut que pour le dashboard : cairn-wms garde
`staging` et `production`.

## Conséquences

- **Ce qu'on peut faire** : mettre le dashboard en production par la seule fusion de la pull
  request `dev` → `main`.
- **Ce qu'on ne peut plus faire** : essayer une version du dashboard dans un environnement réel
  autre que la production.
- **Ce qu'il faut mettre en place** :
  - tranche 1 — le déploiement utilise le **SHA de tête de la pull request**
    (`pull_request.head.sha`, dernier commit de `dev`), jamais celui du commit de fusion : la fusion
    crée sur `main` un commit qui n'a jamais été construit, et le reconstruire contredirait la
    promotion sans reconstruction (§2) ;
  - tranche 1 — l'environnement GitHub `production`, sans validation manuelle ;
  - tranche 1 — `/health` à 503 si le jeton GitHub est refusé ;
  - tranche 5 — `/health` à 503 aussi si la base SQLite est inaccessible, et la base sur un volume
    persistant Coolify.
- **Ce qu'on accepte de payer** : aucun palier entre l'intégration et la production ; le parcours
  `staging` → `production` que pilote la tranche 8 ne s'éprouve que sur cairn-wms, jamais sur le
  dashboard lui-même.
- **Ce qui la remettrait en cause** : une panne du dashboard qui empêcherait de déployer cairn-wms —
  aujourd'hui, `deploiement.yml` reste lançable à la main, sans lui (§3) ; ou d'autres personnes
  que le propriétaire du dépôt qui dépendraient du dashboard pour travailler.
