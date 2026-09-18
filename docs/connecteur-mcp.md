# Le connecteur MCP

Le dashboard expose un connecteur MCP distant, protégé par OAuth, pour que Claude Chat, Claude
Desktop, Claude mobile et Cowork puissent **lire la documentation de cairn-wms et l'alimenter** —
dans `docs/`, sur `dev`, par des commits `docs:`, et rien d'autre ([cadrage](cadrage.md),
principe 2). Le choix du serveur d'autorisation et ce qu'il conserve sont actés par la fiche
[`0011`](decisions/0011-autorisation-oauth-du-connecteur-mcp.md).

## L'ajouter dans Claude

1. Dans Claude, **Customize › Connectors › Add custom connector**.
2. **URL du serveur** : `https://monitoring.cairn-wms.fr/mcp`.
3. **Paramètres avancés** : dans **OAuth Client ID**, la valeur de `NUXT_MCP_CLIENT_ID` posée dans
   l'hébergement. **Pas de secret client** : le client est public, protégé par PKCE.
4. Claude ouvre le dashboard : connexion GitHub si besoin, puis l'écran de consentement, qui dit
   qui demande, où le code partira (`claude.ai`) et ce qui sera accordé. **Autoriser**.

Le connecteur est ensuite disponible sur toutes les surfaces du compte Claude, Cowork compris. Une
autorisation vaut trente jours d'usage : les jetons d'accès durent une heure, et Claude les
renouvelle seul par un jeton de rafraîchissement, tourné à chaque usage.

**Révoquer** : retirer le connecteur dans Claude. Les jetons de rafraîchissement expirés sont
purgés par le dashboard ; un jeton déjà tourné qui se représenterait révoquerait toute sa famille.

## Ce que Claude peut faire

| Outil | Portée | Ce qu'il fait |
|---|---|---|
| `lister_documents` | `docs:read` | L'arbre de `docs/` de cairn-wms, sur `dev`, groupé par dossier. |
| `lire_document` | `docs:read` | Le contenu Markdown d'un document, et son `sha`. |
| `ecrire_document` | `docs:write` | Crée ou met à jour un document de `docs/`, sur `dev`, par un commit `docs: <résumé>`. Une mise à jour exige le `sha` lu, pour qu'une modification croisée soit refusée plutôt qu'écrasée. |

Le serveur borne l'écriture lui-même, quelle que soit la formulation reçue : chemin dans `docs/`,
fichier `.md`, branche `dev`, message composé par le serveur, taille limitée. Un chemin qui en sort
est refusé avant tout appel à GitHub.

**Préalable** : le jeton GitHub du dashboard doit avoir le droit d'**écriture des contenus** sur
cairn-wms. Sans lui, la lecture fonctionne, et l'outil d'écriture répond franchement qu'il est
empêché.

## Ce que le serveur expose

| Adresse | Rôle |
|---|---|
| `/mcp` | Le serveur MCP, Streamable HTTP, sans état. Jeton d'accès Bearer exigé ; sinon `401` avec `WWW-Authenticate`. |
| `/.well-known/oauth-protected-resource` (et `/mcp`) | Métadonnées de ressource protégée (RFC 9728) : qui délivre les jetons, quelles portées. |
| `/.well-known/oauth-authorization-server` | Métadonnées du serveur d'autorisation (RFC 8414) : PKCE `S256`, client public, pas d'enregistrement dynamique. |
| `/oauth/autoriser` | Le point d'autorisation : vérifie la demande, exige le compte autorisé, mène au consentement. |
| `/connecteur/consentement` | L'écran de consentement, dans le dashboard. |
| `/oauth/jeton` | Le point de jeton : code contre jetons, puis rafraîchissement avec rotation. |

Tout est dérivé de l'origine servie : aucune URL en dur.

## Configuration

Deux variables, dans l'hébergement — et nommées sans valeur dans `.env.example` :

| Variable | Rôle |
|---|---|
| `NUXT_MCP_CLIENT_ID` | L'identifiant du seul client autorisé. Public. C'est la valeur saisie dans Claude. |
| `NUXT_MCP_SECRET` | Le secret qui signe les jetons d'accès, au moins 32 caractères, distinct du secret de session. |

`/health` refuse le service tant qu'elles manquent : un connecteur qui ne peut rien délivrer
rendrait le service inutilisable pour Claude sans que rien ne le dise.

## Sur le poste

`npm run dev:fictif` sert le connecteur avec l'identifiant client `client-fictif` et un secret tiré
au hasard ; le faux GitHub accepte les écritures, en mémoire. Claude ne peut pas joindre le poste :
l'épreuve se fait par script, comme dans `scripts/ci/smoke`.
