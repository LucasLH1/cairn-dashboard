# 0011 — Autorisation OAuth du connecteur MCP

**Statut** : actée · **Date** : 2026-09-18 · **Remplace** : — · **Remplacée par** : —

## Contexte

La tranche 7 (issue #7) expose le connecteur MCP distant que le cadrage annonce depuis l'origine :
Claude Chat et Cowork doivent pouvoir **lire** la documentation de cairn-wms et **l'alimenter** —
dans `docs/`, sur `dev`, par des commits `docs:`, et rien d'autre ([`docs/cadrage.md`](../cadrage.md),
principe 2). Le connecteur est **protégé par OAuth** (principe 4) et servi par la même application
Nuxt, avec le SDK MCP officiel TypeScript ([`0001`](0001-pile-du-dashboard.md)).

L'issue #7 posait une condition : si OAuth exige de conserver des clients enregistrés ou des jetons,
c'est une donnée propre que [`0001`](0001-pile-du-dashboard.md) ne confie pas à SQLite — seule
l'historique des événements y vit ([`0007`](0007-historique-des-evenements.md)) — et une fiche doit
trancher où et comment la conserver avant toute implémentation. C'est cette fiche.

### Les faits, relevés à la source le 2026-09-18

Vérifiés dans la spécification MCP (révisions
[2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization) et
[2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)), dans la
documentation des connecteurs Claude
([authentification](https://claude.com/docs/connectors/building/authentication),
[construction](https://claude.com/docs/connectors/building),
[authentification différée](https://claude.com/docs/connectors/building/lazy-authentication)) et
dans les paquets du SDK publiés sur npm — non de mémoire.

**Ce que la spécification impose au serveur MCP** (il joue le rôle de *resource server* OAuth 2.1) :

1. publier des **métadonnées de ressource protégée** (RFC 9728) à
   `/.well-known/oauth-protected-resource`, qui désignent le serveur d'autorisation — **MUST** ;
2. répondre **401** avec un en-tête `WWW-Authenticate: Bearer resource_metadata="…"` quand le jeton
   manque ou est invalide — **MUST** ; Claude ne tient compte de cet en-tête que sur un 401, jamais
   sur un 200 ;
3. **valider que chaque jeton lui est destiné** — audience liée à l'URI canonique du serveur MCP,
   par l'indicateur `resource` (RFC 8707) — **MUST** ; ne jamais accepter ni relayer un autre jeton ;
4. exiger le jeton en en-tête `Authorization: Bearer`, jamais dans l'URL — **MUST** ;
5. valider l'en-tête `Origin` du transport Streamable HTTP — **MUST**.

**Ce qu'elle impose au serveur d'autorisation** : OAuth 2.1 (**MUST**), métadonnées RFC 8414 à
`/.well-known/oauth-authorization-server` (**MUST**), PKCE `S256` annoncé dans
`code_challenge_methods_supported` (les clients **MUST** refuser de continuer sinon), redirect URI
comparées **exactement** aux valeurs enregistrées (**MUST**), jetons d'accès de courte durée
(**SHOULD**), **rotation des jetons de rafraîchissement pour les clients publics (MUST)**, HTTPS
partout (**MUST**). Pour l'enregistrement des clients, la révision 2025-11-25 retient trois voies :
les **documents de métadonnées de client** (CIMD, **SHOULD**), le **pré-enregistrement**, et
l'enregistrement dynamique RFC 7591 (DCR), rétrogradé à **MAY** « pour compatibilité ».

**Ce que Claude fait, sur toutes ses surfaces** (claude.ai, Desktop, mobile, **Cowork**, la même
infrastructure) :

- il prend en charge les révisions 2025-03-26, 2025-06-18 et 2025-11-25 de l'autorisation, et le
  transport Streamable HTTP ;
- il envoie **toujours** PKCE `S256` ; son URL de rappel est **unique** pour les surfaces hébergées :
  `https://claude.ai/api/mcp/auth_callback` (Claude Code, lui, utilise une boucle locale à port
  variable et s'identifie par CIMD) ;
- pour un connecteur personnalisé, il propose de saisir **un identifiant client pré-enregistré**, et
  un secret facultatif, dans les paramètres avancés — « une bonne option pour un client OAuth
  stable » ; sans identifiant saisi, il tente CIMD si les métadonnées l'annoncent, puis DCR ;
- son point de terminaison de jeton reçoit du `application/x-www-form-urlencoded` ; il rafraîchit
  sur 401 et jusqu'à cinq minutes avant l'expiration, attend `invalid_grant` quand un jeton de
  rafraîchissement ne vaut plus, et **s'attend à la rotation** ;
- ses appels partent de la plage `160.79.104.0/21` et attendent moins de dix secondes ; il met en
  cache les documents de découverte environ cinq minutes.

**Ce que le SDK officiel fournit.** La v2 (`@modelcontextprotocol/server` 2.0.0, publiée le
2026-09-17, lignée déclarée stable) sert un serveur MCP en Streamable HTTP par une fonction
standard `fetch(Request) → Response`, **sans état** par construction, et offre une garde
`requireBearerAuth` dont la vérification du jeton est **injectée**. Elle **ne fournit aucun serveur
d'autorisation** — ni `authorize`, ni `token`, ni `register` : sa documentation renvoie à « un
fournisseur d'identité dédié », et les aides de la v1 sont figées dans un paquet `server-legacy`.
Son adaptateur Node dépend de Hono ; il n'est pas nécessaire, h3 1.15 — celui que Nitro exécute —
sait passer une requête web à un gestionnaire et renvoyer sa réponse.

**Ce que le dashboard a déjà** : une connexion GitHub réservée à un seul compte, reconnu par son
identifiant numérique et revérifié à chaque requête (tranche 1b) ; des garde-fous d'écriture —
origine vérifiée, jeton d'intention (tranche 4) ; une base SQLite sur volume persistant, avec ses
migrations et sa purge (tranches 5 et 6).

## Options

### Option A — Le dashboard est son propre serveur d'autorisation, pour un client pré-enregistré

- **Ce que c'est** : les points de terminaison OAuth 2.1 vivent dans l'application, à côté du
  serveur MCP. Un seul client, connu d'avance : Claude, identifié par un identifiant choisi et posé
  en variable d'environnement, saisi une fois par Lucas dans les paramètres avancés du connecteur ;
  une seule URL de rappel, celle des surfaces hébergées de Claude, fixée dans le code. Client
  public, PKCE obligatoire. L'utilisateur est authentifié par **la session GitHub existante** — le
  seul compte autorisé —, puis consent sur un écran du dashboard. Les jetons d'accès sont signés et
  de courte durée, liés à l'audience ; les jetons de rafraîchissement sont aléatoires, tournés à
  chaque usage, et **leur empreinte est conservée en SQLite** — la seule donnée que la rotation
  impose de garder. Les codes d'autorisation vivent une minute, en mémoire.
- **En faveur** :
  - c'est la forme la plus fermée qui existe : **un client, une URL de rappel, un compte**, tous
    connus d'avance et comparés exactement ;
  - aucune inscription ouverte sur l'internet public, aucune URL à aller chercher ;
  - l'authentification est celle qui existe déjà, avec son garde-fou revérifié à chaque requête ;
  - le pré-enregistrement est une voie de première classe de la spécification et de Claude ;
  - ce qu'il faut conserver tient dans une table minuscule, purgée comme l'historique.
- **En défaveur** :
  - le serveur d'autorisation est à écrire — métadonnées, autorisation, consentement, jeton, PKCE,
    rotation — soit quelques centaines de lignes que le SDK ne fournit pas, à éprouver par des cas
    qui doivent échouer ;
  - Claude Code n'est pas couvert : il s'identifie par CIMD et rappelle sur une boucle locale ;
  - une nouvelle table en SQLite, ce que [`0001`](0001-pile-du-dashboard.md) réservait à
    l'historique.
- **Ce que ça ferme** : rien. Le CIMD (option B) s'ajoute par-dessus le jour où un autre client se
  présente ; les jetons ne changent pas.

### Option B — Le dashboard serveur d'autorisation, clients identifiés par CIMD

- **Ce que c'est** : comme A, mais l'identifiant client est **une URL** que le serveur va chercher
  pour lire les métadonnées du client (nom, URL de rappel), comme la révision 2025-11-25 le
  recommande. Claude la choisit d'abord si les métadonnées l'annoncent ; Claude Code aussi.
- **En faveur** : rien à saisir dans Claude ; Claude Code couvert ; la voie **SHOULD** de la
  spécification.
- **En défaveur** :
  - le serveur d'autorisation **va chercher une URL fournie par un inconnu** : une surface de
    SSRF que la spécification elle-même signale, à borner par une liste de domaines de confiance ;
  - les URL de rappel en boucle locale de Claude Code sont à comparer **port ignoré**, avec
    l'avertissement d'usurpation que la spécification demande d'afficher ;
  - un cache des documents, des délais, des cas d'échec en plus — pour un besoin que l'issue #7
    ne formule pas : Claude Chat et Cowork, pas Claude Code.
- **Ce que ça ferme** : rien.

### Option C — Enregistrement dynamique des clients (DCR)

- **Ce que c'est** : un point de terminaison `/register` ouvert, où tout client se crée un
  identifiant ; les clients enregistrés sont conservés.
- **En faveur** : la voie historique, que Claude prend en charge « d'emblée ».
- **En défaveur** : une inscription ouverte sur l'internet public ; une table de clients dont
  Claude lui-même prévient qu'elle grossit à chaque nouvelle connexion ; rétrogradé à **MAY** par la
  spécification, « pour compatibilité ».
- **Ce que ça ferme** : rien, mais c'est la voie que tout le monde quitte.

### Option D — Un serveur d'autorisation externe

- **Ce que c'est** : un fournisseur d'identité hébergé — ce que recommande le SDK — désigné par les
  métadonnées du serveur MCP ; il gère clients, consentement et jetons ; le dashboard ne fait que
  vérifier les jetons qu'il émet.
- **En faveur** : rien à écrire côté autorisation ; des mécanismes éprouvés.
- **En défaveur** : un troisième service — compte, configuration, secrets, disponibilité, coût —
  pour **un seul utilisateur et un seul client**, alors que le dashboard sait déjà authentifier ce
  compte ; le principe « aucun secret hors des variables d'environnement » s'étend à un tiers ; la
  connexion à l'interface et celle du connecteur ne seraient plus la même.
- **Ce que ça ferme** : la maîtrise de ce que le consentement montre et de ce qu'un jeton contient.

### Option E — Pas d'OAuth : un jeton fixe en en-tête

- **Ce que c'est** : Claude envoie un secret fixe sur chaque requête (`static_headers`).
- **En défaveur** : réservé aux administrateurs d'organisation Team et Enterprise, en bêta ; contraire
  au cadrage, qui exige OAuth.
- **Ce que ça ferme** : le consentement, la révocation, l'expiration.

### Sous-option, dans A — ne rien conserver du tout

Sans jeton de rafraîchissement, rien n'aurait à vivre en base : un jeton d'accès de douze heures,
puis Claude redemanderait l'autorisation. C'est une carte « Connecter » qui réapparaîtrait chaque
demi-journée dans la conversation, pour un outil fait pour être ouvert et oublié. Écarté : la table
est minuscule, la purge existe déjà.

## Décision

**Le dashboard est le serveur d'autorisation de son propre connecteur MCP, pour un client
pré-enregistré — Claude — authentifié par la session GitHub existante ; seules les empreintes des
jetons de rafraîchissement sont conservées, en SQLite.**

Le critère décisif est la **fermeture** : un utilisateur, un client, une URL de rappel, tous connus
d'avance, comparés exactement, et un serveur qui ne va rien chercher chez un inconnu. L'option B
ouvre une surface — aller chercher des URL — pour couvrir un client que l'issue ne demande pas ;
l'option C ouvre une inscription ; l'option D ajoute un service pour authentifier un compte que le
dashboard authentifie déjà ; l'option E contredit le cadrage. Le serveur d'autorisation à écrire est
petit, et il sera éprouvé comme les autres garde-fous : par des cas qui doivent échouer.

Décision validée en séance le 2026-09-18. Elle ne vaut que pour le dashboard.

### Ce qui l'encadre

- **Le client** : un identifiant public, `NUXT_MCP_CLIENT_ID`, choisi et saisi par Lucas dans les
  paramètres avancés du connecteur ; **aucun secret client** — client public, PKCE `S256` exigé.
  Une seule URL de rappel acceptée, `https://claude.ai/api/mcp/auth_callback`, comparée exactement.
- **Le consentement** : exige une session du compte autorisé — sans session, le parcours de
  connexion GitHub, puis retour ; l'écran nomme le client, l'hôte de rappel, et les portées
  demandées, avec les briques du design ; il est bâti sur les garde-fous d'écriture existants
  (origine vérifiée).
- **Les portées** : `docs:read` et `docs:write`, toutes deux annoncées ; le serveur MCP les vérifie
  outil par outil, et répond 403 `insufficient_scope` s'il en manque une.
- **Le jeton d'accès** : signé HMAC-SHA256 avec un secret propre, `NUXT_MCP_SECRET` (≥ 32
  caractères), **une heure**, portant émetteur, audience — l'URI canonique du serveur MCP, celle que
  Claude a saisie —, sujet — l'identifiant numérique GitHub, **revérifié contre le compte autorisé à
  chaque requête**, comme la session —, client, portées, émission, expiration, identifiant unique.
  Rien n'est conservé : il se vérifie seul.
- **Le jeton de rafraîchissement** : 32 octets aléatoires, remis une fois, **conservé par son
  empreinte SHA-256** dans une table `jetons_mcp` — client, sujet, portées, famille, création,
  expiration à trente jours, remplacement. **Tourné à chaque usage** : l'ancien est marqué
  remplacé ; un jeton déjà remplacé qui se représente révoque toute sa famille et répond
  `invalid_grant`. Migration 3, purge des expirés avec celle de l'historique.
- **Les codes d'autorisation** : aléatoires, **une minute**, à usage unique, en mémoire — liés au
  client, à l'URL de rappel, au défi PKCE, à la ressource, aux portées et au sujet. Un
  redémarrage les perd ; le parcours recommence.
- **Le serveur MCP** : `/mcp`, Streamable HTTP sans état par le SDK v2, servi par Nitro à travers
  le pont `Request`/`Response` de h3 — sans l'adaptateur Node ni Hono ; `Origin` et `Host`
  vérifiés contre l'origine servie ; 401 `WWW-Authenticate: Bearer resource_metadata="…"` sur tout
  jeton manquant, invalide ou expiré, avec la portée minimale attendue.
- **Les métadonnées** : `/.well-known/oauth-protected-resource` (et sa variante `/mcp`) et
  `/.well-known/oauth-authorization-server`, servies par le dashboard, dérivées de l'origine servie
  — aucune URL en dur. Elles n'annoncent ni CIMD ni enregistrement dynamique.
- **Les outils** : lire l'arbre de `docs/`, lire un document, écrire un document — ce dernier
  **borné par le serveur** à `docs/`, à `.md`, à la branche `dev`, à un message préfixé `docs:` que
  le serveur compose lui-même, et à une taille maximale ; l'écriture passe par l'API de contenu de
  GitHub avec le `sha` du fichier lu, pour qu'une modification croisée soit refusée plutôt
  qu'écrasée.
- **`/health`** dit si le connecteur est configurable — identifiant client et secret présents —
  et refuse le service sinon, comme pour la connexion (tranche 1b).

## Conséquences

- **Ce qu'on peut faire** : ajouter le connecteur dans Claude en saisissant son URL et l'identifiant
  client, consentir une fois, et lire ou alimenter la documentation de cairn-wms depuis Claude Chat
  et Cowork sans reconnexion pendant trente jours d'usage.
- **Ce qu'on ne peut plus faire** : accepter un autre client, une autre URL de rappel ou un autre
  compte sans nouvelle fiche ; confier à SQLite une autre donnée que l'historique et ces empreintes
  sans nouvelle fiche. [`0001`](0001-pile-du-dashboard.md) et
  [`0007`](0007-historique-des-evenements.md) restent actées : cette fiche complète ce que la base
  conserve, elle ne les réécrit pas.
- **Ce qu'il faut mettre en place** (tranche 7, issue #7) :
  - `@modelcontextprotocol/server` — le SDK officiel retenu par `0001`, dans sa lignée v2 ;
  - les points de terminaison OAuth, l'écran de consentement, la migration 3, la purge, la
    vérification dans `/health` ;
  - le test de fumée éprouve les refus : sans jeton, jeton d'une autre audience, jeton expiré, code
    réutilisé, PKCE faux, URL de rappel inconnue, jeton de rafraîchissement déjà tourné ;
  - deux variables d'environnement, nommées sans valeur dans `.env.example` : `NUXT_MCP_CLIENT_ID`
    (public) et `NUXT_MCP_SECRET` (secret) ;
  - **un préalable** : le jeton GitHub de production, aujourd'hui limité à la lecture des contenus,
    doit recevoir le droit d'écriture des contenus sur cairn-wms — sans quoi l'outil d'écriture
    répond franchement qu'il en est empêché ;
  - le mode fictif ([`0010`](0010-developpement-local-sur-donnees-fictives.md)) apprend l'écriture
    de contenu, pour éprouver l'outil sur le poste sans toucher cairn-wms.
- **Ce qu'on accepte de payer** : un serveur d'autorisation à tenir — petit, mais à nous ; Claude
  Code hors du connecteur tant que le CIMD n'est pas ajouté ; une table de plus dans la base ; des
  codes perdus au redémarrage.
- **Ce qui la remettrait en cause** : le besoin d'un second client (Claude Code, un autre outil),
  qui appellerait le CIMD ; une révision de la spécification ou de Claude qui cesserait de prendre
  en charge le pré-enregistrement ; un second compte autorisé.
