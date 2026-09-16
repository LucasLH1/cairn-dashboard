# 0008 — Réception des événements des sessions Claude Code

**Statut** : actée · **Date** : 2026-09-16 · **Remplace** : — · **Remplacée par** : —

## Contexte

La tranche 6 (issue #6) fait entrer dans le fil d'activité les événements des sessions Claude Code,
à côté des webhooks GitHub reçus en tranche 5. Le cadrage l'a prévu dès l'origine
([`docs/cadrage.md`](../cadrage.md), « ce qu'il reçoit »), et la fiche [`0001`](0001-pile-du-dashboard.md)
a retenu Nitro pour cette raison.

Trois contraintes du cadrage s'appliquent :

- **principe 3** : aucun secret dans le dépôt, qui est public. Le secret des hooks vit en variable
  d'environnement, et la configuration versionnée ne peut que la référencer ;
- **principe 4** : la route de réception est publique — une session Claude Code n'a pas de cookie —
  donc elle est authentifiée par son secret, comme celle des webhooks ;
- **règle 6** de [`CLAUDE.md`](../../CLAUDE.md) : les hooks ne doivent jamais gêner le travail. Un
  hook lent ou en échec ne peut pas ralentir une session, ni la faire échouer.

### Les faits, relevés à la source le 2026-09-16

Vérifiés dans la documentation officielle (`code.claude.com/docs/en/hooks.md` et `hooks-guide.md`),
et non de mémoire. Quatre d'entre eux commandent le choix :

1. **`SessionStart` n'accepte que `command` et `mcp_tool`.** Il ne supporte ni `http`, ni `prompt`,
   ni `agent` — la documentation le dit explicitement. Or le début de session fait partie de ce que
   la tranche doit capter.
2. **`async: true` n'existe que sur les hooks `command`.** C'est le seul mode où Claude Code lance le
   hook et continue immédiatement, sans lui appliquer de délai d'expiration.
3. **Un hook synchrone bloque jusqu'à son délai**, dont la valeur par défaut est de **600 secondes**
   pour `command`, `http` et `mcp_tool`. `SessionEnd` fait exception : ses hooks se partagent un
   budget de 1,5 seconde.
4. **Un en-tête de hook `http` peut interpoler `$VAR`**, mais uniquement pour les noms déclarés dans
   `allowedEnvVars` ; toute autre référence est remplacée par une chaîne vide.

Un cinquième fait est traité par la fiche [`0009`](0009-identite-des-evenements-de-session.md) :
**aucun événement ne porte d'identifiant de livraison**. Il n'existe pas d'équivalent du
`X-GitHub-Delivery` sur lequel la tranche 5 s'appuie.

### Ce que les charges contiennent, et qu'on ne veut pas

L'entrée d'un hook porte des champs manifestement sensibles : `tool_input` (le texte d'une commande,
le contenu d'un fichier écrit), `prompt` (le texte de la demande), `transcript_path`,
`last_assistant_message`. Moins évident, et plus piégeux : l'entrée de `Stop` contient
`background_tasks[].command` et `session_crons[].prompt` — du texte de commande et de demande, à
deux niveaux de profondeur.

**Conséquence : on ne peut pas filtrer une charge, il faut la construire.** Une liste noire manquera
toujours le champ qu'une version future ajoutera.

## Options

### Option A — Un hook `command` asynchrone, un seul script

- **Ce que c'est** : un script court, déclaré sur chaque événement retenu avec `"async": true`. Il
  lit le secret dans son environnement — un hook hérite de l'environnement parent — construit un
  message de métadonnées et le poste au dashboard. La configuration versionnée ne contient que le
  chemin du script.
- **En faveur** :
  - **le seul mécanisme qui couvre tous les événements retenus**, `SessionStart` compris ;
  - **le seul qui ne bloque jamais** : Claude Code n'applique aucun délai à un hook asynchrone, et
    la session continue sans l'attendre ;
  - un échec est silencieux par construction : la sortie d'un hook asynchrone n'est pas montrée ;
  - le message est **construit** champ par champ, ce que la section précédente impose ;
  - un seul mécanisme à écrire, à éprouver et à expliquer.
- **En défaveur** : un script à verser dans chaque dépôt, et une variable à définir sur le poste.
- **Ce que ça ferme** : rien.

### Option B — Un hook `http` natif, sans script

- **Ce que c'est** : Claude Code poste lui-même la charge du hook, en portant le secret dans un
  en-tête par `allowedEnvVars`.
- **En faveur** : aucun script à écrire ni à versionner ; le secret n'apparaît nulle part dans le
  dépôt, garanti par le mécanisme lui-même.
- **En défaveur** :
  - **ne couvre pas `SessionStart`** — fait n° 1 ;
  - **bloque la session** jusqu'à son délai, faute d'`async` — faits n° 2 et 3 ;
  - poste **la charge entière**, donc le texte des demandes et des commandes : le tri devrait se
    faire à l'arrivée, sur un dépôt public, après que ces données ont quitté le poste.
- **Ce que ça ferme** : le début de session, sauf à ajouter un second mécanisme.

### Option C — Mixte : `http` où il est accepté, `command` pour `SessionStart`

- **Ce que c'est** : les deux, chacun là où il fonctionne.
- **En faveur** : couvre tous les événements.
- **En défaveur** : deux mécanismes, deux formats de message, deux chemins d'authentification et deux
  jeux de tests, pour un seul flux — et l'option B envoie toujours la charge entière.
- **Ce que ça ferme** : rien, mais double durablement le coût d'entretien.

## Décision

**Les événements des sessions Claude Code sont envoyés par un unique hook `command` asynchrone, un
script par dépôt, qui construit un message de métadonnées et le poste au dashboard.**

Le critère décisif est la **couverture** : l'option A est la seule qui capte tous les événements
retenus, `SessionStart` compris, et la seule qui ne bloque jamais la session. L'option B échoue sur
le début de session et bloquerait jusqu'à son délai ; l'option C y remédie au prix de deux
mécanismes pour un seul flux. Que l'option A construise le message plutôt que de relayer la charge
n'est pas un effet secondaire : c'est ce que la confidentialité exige, et l'option B ne le permet
pas.

### Les événements retenus

Quatre, et rien d'autre. Ce qui n'est pas dans cette liste n'est pas envoyé — le tri se fait sur le
poste, avant l'envoi, et non à l'arrivée.

| Événement | Ce qu'il marque | Volume attendu |
|---|---|---|
| `SessionStart` | une session s'ouvre | 1 par session |
| `SessionEnd` | une session se termine | 1 par session |
| `Stop` | l'agent a fini de répondre — une tâche est achevée | quelques dizaines par session |
| `PostToolUse`, **restreint par matcher à `Edit\|Write\|NotebookEdit`** | un fichier a été modifié | proportionnel au travail réel |

**`PostToolUse` sans restriction est écarté** : il se déclenche une fois par appel d'outil, lectures
et recherches comprises, ce qui produirait des centaines d'événements sans rien dire de l'avancement
du projet. Restreint aux outils qui **écrivent**, il porte le seul signal utile à un tableau de
suivi. `PreToolUse` est écarté pour la même raison : il doublerait le volume sans rien ajouter.

### Ce que le message contient

Le script **construit** le message à partir d'une liste blanche. Aucun autre champ n'est lu, et un
champ inconnu d'une version future n'est donc jamais transmis.

| Champ | Origine | Pourquoi |
|---|---|---|
| `evenement` | `hook_event_name` | de quoi il s'agit |
| `session` | `session_id` | pour regrouper |
| `depot` | **nom du dossier** de `cwd`, jamais le chemin | dire quel projet, sans exposer l'arborescence du poste |
| `outil` | `tool_name` | seulement sur `PostToolUse` |
| `motif` | `source` (`SessionStart`) ou `reason` (`SessionEnd`) | comment la session a commencé ou fini |
| `agent` | `agent_type` | pour distinguer un sous-agent |
| `horodatage` | horloge du poste, ISO 8601 | quand |
| `cle` | voir fiche [`0009`](0009-identite-des-evenements-de-session.md) | pour rejeter un doublon |

**Ne sont jamais lus, donc jamais envoyés** : `tool_input`, `tool_response`, `prompt`,
`transcript_path`, `last_assistant_message`, `background_tasks`, `session_crons`, `scratchpad_dir`,
`permission_mode`, et le chemin complet de `cwd`.

### L'authentification

**Le secret est porté dans un en-tête, et comparé à temps constant** par la route de réception.

La signature HMAC de la tranche 5 a été envisagée puis écartée : elle existe parce que GitHub ne
peut pas porter d'en-tête d'authentification, et elle prouve l'intégrité d'un corps que TLS protège
déjà. Ici l'émetteur est le poste, il peut porter un en-tête, et la charge reçue est **rangée, jamais
exécutée** : l'intégrité qu'ajouterait HMAC ne porte rien. Le secret partagé, comparé à temps
constant, suffit — et fait un script sans dépendance à `openssl`.

Un secret absent de la configuration du serveur fait répondre `503`, comme pour les webhooks : on
refuse tout plutôt que d'accepter n'importe quoi.

### Où vivent le script et la configuration

Le script est **versionné et éprouvé dans le seul dépôt du dashboard**, puis **installé** sur le
poste à un emplacement fixe par une commande dédiée. Chaque dépôt suivi active les hooks dans son
propre `.claude/settings.json` versionné, qui ne fait qu'appeler le script installé.

- **Rien n'est déclaré dans `~/.claude/settings.json`** : les hooks partiraient alors de tous les
  projets du poste, y compris ceux qui n'ont rien à voir avec Cairn.
- **Un script absent est un échec silencieux** : un poste qui ne l'a pas installé n'émet rien, et la
  session n'en sait rien. C'est le comportement voulu pour deux dépôts publics que n'importe qui peut
  cloner.
- **Le script refuse tout dépôt qu'il ne connaît pas** : il n'émet que depuis `cairn-wms` et
  `cairn-dashboard`. Un `.claude/settings.json` recopié ailleurs n'enverrait rien.
- **Le secret vit dans la section `env` de `~/.claude/settings.json`**, hors de tout dépôt, en droits
  `600`. Vérifié à la source le 2026-09-16 : les valeurs de `env` « atteignent tous les sous-processus
  que Claude Code démarre », dont les hooks. Cet emplacement est préféré à `~/.bashrc`, que les
  sessions à distance ne chargent pas nécessairement.

Validée en séance le 2026-09-16, cette variante ayant été retenue contre la première rédaction, qui
versait un script dans chaque dépôt.

## Conséquences

- **Ce qu'on peut faire** : suivre l'activité réelle des sessions sur les deux dépôts, dans le même
  fil que les événements GitHub, sans qu'aucun texte de demande, de commande ou de fichier ne quitte
  le poste.
- **Ce qu'on ne peut plus faire** : ajouter un événement à la liste des quatre, ou un champ à la
  liste blanche, sans passer par une nouvelle fiche — c'est précisément ce qui garantit qu'on
  n'élargira pas la collecte par petites touches.
- **Ce qu'il faut mettre en place** (tranche 6, issue #6) :
  - la route publique de réception, inscrite dans la liste fermée de `server/utils/acces.ts`, avec
    taille bornée, débit limité — **au plus 120 événements par minute**, au-delà desquels on refuse
    sans rien écrire — et comparaison du secret à temps constant ;
  - le script d'envoi, sa commande d'installation et ses tests, dans ce dépôt ;
  - le `.claude/settings.json` de ce dépôt, versionné ;
  - la variable `NUXT_HOOKS_SECRET` côté serveur, nommée sans valeur dans `.env.example`, et la
    variable `CAIRN_HOOKS_SECRET` dans la section `env` de `~/.claude/settings.json` ;
  - **le contenu exact du `.claude/settings.json` de cairn-wms**, préparé ici mais **posé là-bas par
    une session dédiée** : ce dépôt a ses propres règles, son journal et son `status.yml`. Rien n'y
    sera versé depuis ici.
- **Ce qu'on accepte de payer** : un script à installer sur chaque poste, et une installation à
  refaire quand il change ; une variable à définir dans les réglages utilisateur ; et un événement
  perdu sans trace si le dashboard est indisponible — un hook asynchrone n'a ni accusé de réception
  ni réémission.
- **Ce qui la remettrait en cause** : le jour où `SessionStart` accepterait les hooks `http`, ou
  qu'un hook `http` deviendrait asynchrone, l'option B redeviendrait défendable et supprimerait les
  scripts.
