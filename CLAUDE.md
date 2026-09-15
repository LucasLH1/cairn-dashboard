# Règles de travail — Cairn Dashboard

Ce dépôt est **public**. Il contient le dashboard de suivi de Cairn WMS : une application qui lit et
écrit dans le dépôt cairn-wms, par GitHub, et n'en est qu'une interface. Sa pile est actée ; à ce
stade, aucun code applicatif n'est écrit.

Ces règles priment sur toute habitude, tout raccourci et toute suggestion contraire.

---

## 1. Lire avant d'agir

Avant toute action — réponse, proposition, modification, création de fichier — lire :

- `docs/cadrage.md` : la finalité, le périmètre et les principes du dashboard — en particulier ce
  qu'il a le droit d'écrire, et où ;
- `docs/decisions/` : les décisions engageantes déjà prises, et leur statut ;
- `status.yml` : la tranche en cours, et ce qu'elle doit rendre utilisable ;
- `docs/deploiement.md`, dès qu'on touche à l'intégration, à l'image ou à la mise en service.

**cairn-wms est la source de vérité, le dashboard n'en est qu'une interface.** Ce que le dashboard
lit de cairn-wms — documentation, `status.yml`, journal, issues, labels — se lit tel qu'il est dans
le dépôt cairn-wms, jamais tel qu'on le suppose : avant de coder une lecture, vérifier le format
réel à la source. Le vocabulaire métier est celui du glossaire de cairn-wms (son
`docs/glossaire.md`) : le dashboard le reprend, il n'en invente pas.

**Un comportement non décrit ne se tranche pas à l'improviste.** Il se remonte comme une question.

## 2. Ne jamais supposer un choix technique

**Ce qui n'est pas écrit dans `docs/decisions/` n'est pas décidé.**

La pile est actée dans `docs/decisions/` : fiche `0001` pour la pile, `0002` pour l'hébergement,
`0003` pour l'environnement unique. On s'y tient, sans substitution ni ajout silencieux.

Tout autre choix engageant — hébergement, bibliothèque structurante, schéma de données, et ce que
liste `docs/decisions/README.md` — passe par une fiche écrite depuis `docs/decisions/modele.md`,
statut `proposée`, et validée avant d'être mise en œuvre. **On n'implémente pas une fiche
`proposée`.**

En conséquence, dans ce dépôt :

- ne pas ajouter de dépendance structurante, de service, de base ou de table sans fiche actée qui
  les couvre ;
- ne pas déduire un choix technique d'un fichier existant, d'un exemple trouvé, ni de l'habitude
  d'un autre projet — cairn-wms compris : ses décisions ne valent pas ici, et celles d'ici ne
  valent pas pour lui ;
- ne pas « commencer par » une solution en attendant que la décision soit prise. Le provisoire
  fait autorité par défaut : c'est précisément ce qu'on refuse ici.

## 3. Clore chaque session par ses trois traces

Une session n'est pas finie tant que ces trois-là ne sont pas à jour. Elles se font à la fin, et
elles ne se délèguent pas au « prochain coup ».

1. **Une entrée dans `journal/`** — un fichier `AAAA-MM-JJ-HHMM-sujet.md` ouvert par son en-tête
   YAML, au format décrit dans `journal/README.md` : objectif, actions, décisions, fichiers touchés,
   issues liées, points ouverts.
2. **`status.yml` mis à jour** — l'état de chaque tranche touchée (`à faire`, `en développement`,
   `livré`), et le champ `mis_a_jour_le`. Un état ne se fait avancer que par ce qui existe
   réellement, jamais par ce qui est prévu : `livré` veut dire utilisable de bout en bout, en
   production.
3. **Les issues GitHub concernées référencées et mises à jour** — les citer par leur numéro dans
   l'entrée de journal et dans les messages de commit, commenter ce qui a avancé, fermer ce qui est
   fait, en ouvrir une pour tout travail identifié et non traité.

## 4. Travailler sur `dev`, ne jamais pousser sur `main`

- `dev` est la branche de travail et la branche par défaut. Tout commit y va, ou sur une branche
  issue d'elle.
- `main` est la production. **Aucun push direct**, jamais, sous aucun prétexte — y compris pour un
  correctif d'une ligne. La branche est protégée sans exception, administrateur compris : la
  fusion passe par une pull request.
- La fusion de la pull request `dev` → `main` **met le dashboard en production**
  (`docs/decisions/0003`). C'est une décision humaine : ne pas ouvrir, approuver ni fusionner une
  pull request vers `main` de sa propre initiative.
- Vérifier la branche courante avant de committer.

## 5. Ne jamais committer de secret

**Le dépôt est public.** Tout ce qui y entre est lisible par n'importe qui, immédiatement et
définitivement — un secret poussé puis retiré reste dans l'historique et doit être révoqué.

Ne jamais écrire dans un fichier suivi : mot de passe, jeton, clé d'API, clé privée, certificat,
chaîne de connexion, ni donnée personnelle. Cela vise en particulier le jeton GitHub, les secrets
OAuth, les secrets des webhooks GitHub et des hooks Claude Code, et le jeton Coolify.

- Les valeurs sensibles vivent **uniquement en variables d'environnement** : dans Coolify et les
  environnements GitHub pour la production, dans un fichier non suivi sur le poste. Seul un modèle
  sans valeur réelle (`.env.example`) peut être suivi.
- Le `.gitignore` exclut déjà les fichiers d'environnement, le matériel de clé et les bases SQLite :
  ne pas le contourner par un `git add --force`.
- Les événements reçus — webhooks, hooks Claude Code — vont dans la base, jamais dans un fichier
  suivi, pas même comme exemple : un exemple de documentation utilise des valeurs manifestement
  fictives.
- En cas de doute sur un fichier : ne pas le committer, et poser la question.

## 6. Livrer tranche par tranche, en découpage vertical

Le dashboard se construit en huit tranches, listées dans `status.yml` et portées chacune par une
issue.

- **Une tranche à la fois, dans l'ordre.** On ne commence pas la suivante tant que la précédente
  n'est pas livrée.
- **Découpage vertical.** Une tranche traverse toutes les couches dont elle a besoin — interface,
  serveur, accès GitHub, données, mise en service — pour une fonctionnalité complète. On ne bâtit
  pas « tout le serveur » puis « toute l'interface ».
- **Livrée veut dire utilisable de bout en bout**, en production : pas « le code est écrit », pas
  « ça marche en local ».
- Ce qui ne relève pas de la tranche en cours ne s'anticipe pas dans le code : il se note dans
  l'issue de la tranche concernée.
