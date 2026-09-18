# Événements des sessions Claude Code

Comment les sessions de travail alimentent le fil d'activité du dashboard, et ce qu'elles n'en
disent pas. Les décisions sont dans [`0008`](decisions/0008-reception-des-evenements-de-session.md)
— ce qui est reçu et par quel mécanisme — et [`0009`](decisions/0009-identite-des-evenements-de-session.md)
— ce qui distingue deux événements.

## Le principe

Claude Code déclenche des **hooks** à des moments précis d'une session. Un hook `command`
**asynchrone** appelle un petit script sur le poste ; Claude Code n'attend pas sa réponse et n'est
jamais ralenti. Le script construit un message de **métadonnées** et le poste au dashboard, qui
l'enregistre et le diffuse dans le fil.

Le script est versionné et éprouvé **ici seulement** (`scripts/hooks/cairn-hooks.mjs`), puis
installé à un emplacement fixe du poste. Chaque dépôt suivi l'appelle depuis son propre
`.claude/settings.json`.

## Ce qui est envoyé, et ce qui ne l'est jamais

Le message porte **huit champs, et rien d'autre** :

| Champ | Ce que c'est |
|---|---|
| `evenement` | `SessionStart`, `SessionEnd`, `Stop` ou `PostToolUse` |
| `session` | l'identifiant de la session, pour regrouper |
| `depot` | `cairn-wms` ou `cairn-dashboard` — le **nom** du dépôt, jamais son chemin |
| `outil` | le nom de l'outil, sur `PostToolUse` seulement |
| `motif` | comment la session a commencé ou s'est terminée |
| `agent` | le type du sous-agent, s'il y en a un |
| `horodatage` | l'heure du poste |
| `cle` | ce qui identifie l'événement (fiche `0009`) |

**Ne quittent jamais le poste** : le texte des demandes, le contenu des fichiers, le texte des
commandes, le chemin du transcript, la réponse de l'assistant, les tâches en cours et les réveils
programmés. Le script **construit** le message à partir de cette liste ; il ne filtre pas une charge
reçue. C'est délibéré : une liste noire manquerait le champ qu'une version future ajouterait.

Cette garantie est éprouvée par `test/hooks-script.spec.ts`, qui lance réellement le script avec une
entrée piégée et vérifie ce qui sort.

## Installation sur le poste

```bash
npm run hooks:installer
```

Le script est copié dans `~/.local/bin/cairn-hooks`. **À refaire après chaque modification du
script** : c'est la copie installée qui s'exécute, pas celle du dépôt.

Puis le secret, **hors de tout dépôt**, dans la section `env` de `~/.claude/settings.json` :

```json
{
  "env": {
    "CAIRN_HOOKS_SECRET": "la-même-valeur-que-NUXT_HOOKS_SECRET"
  }
}
```

```bash
chmod 600 ~/.claude/settings.json
```

Les valeurs de `env` atteignent tous les sous-processus que Claude Code démarre, dont les hooks.
Cet emplacement est préféré à `~/.bashrc`, que les sessions à distance ne chargent pas
nécessairement. **Une nouvelle session est nécessaire** pour que la variable soit prise.

**Poste Windows + WSL : les hooks n'émettent que depuis une session lancée dans WSL.** Le script est
installé dans le `~/.local/bin` de WSL, et le secret vit dans le `~/.claude/settings.json` de WSL.
Une session Claude Code lancée côté Windows a un autre `$HOME` : elle ne trouve pas le script —
`test -x "$HOME/.local/bin/cairn-hooks"` échoue, et le `|| true` la laisse continuer sans un mot —
elle n'émet donc rien. C'est le garde-fou du script (« un script absent est un échec silencieux »),
appliqué ici à la frontière des deux environnements.

Côté serveur, la même valeur se nomme `NUXT_HOOKS_SECRET` (Coolify en production, `.env` en local).

## Activer les hooks dans un dépôt

Le fichier ci-dessous est celui de ce dépôt, et **c'est exactement celui à poser dans cairn-wms**,
à `.claude/settings.json`, sans rien y changer : le script reconnaît le dépôt tout seul, à partir du
dossier qui porte le `.git`.

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "test -x \"$HOME/.local/bin/cairn-hooks\" && \"$HOME/.local/bin/cairn-hooks\" || true",
            "async": true
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "test -x \"$HOME/.local/bin/cairn-hooks\" && \"$HOME/.local/bin/cairn-hooks\" || true",
            "async": true
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "test -x \"$HOME/.local/bin/cairn-hooks\" && \"$HOME/.local/bin/cairn-hooks\" || true",
            "async": true
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "test -x \"$HOME/.local/bin/cairn-hooks\" && \"$HOME/.local/bin/cairn-hooks\" || true",
            "async": true
          }
        ]
      }
    ]
  }
}
```

> Ce fichier est **posé dans cairn-wms par une session dédiée à ce dépôt**, avec son propre journal,
> son `status.yml` et sa pull request. Rien n'y est versé depuis le dashboard : les deux dépôts ont
> chacun leurs règles.

Trois garde-fous expliquent la forme de la commande :

- **`test -x … ||  true`** : un poste où le script n'est pas installé n'émet rien, et la session ne
  s'en aperçoit pas. C'est ce qu'il faut pour deux dépôts publics que n'importe qui peut cloner.
- **`PostToolUse` est restreint à `Edit|Write|NotebookEdit`** : sans ce filtre, l'événement se
  déclenche à chaque lecture et à chaque recherche, et le fil se noierait.
- **Rien n'est déclaré dans `~/.claude/settings.json`** : les hooks partiraient alors de tous les
  projets du poste.

## Ce qui n'est pas garanti

- **Un événement émis pendant que le dashboard est indisponible est perdu.** Un hook asynchrone n'a
  ni accusé de réception ni réémission, et c'est assumé : une session de travail ne s'interrompt pas
  pour un fil d'activité.
- **`SessionEnd` peut manquer.** Claude Code se réserve d'arrêter les hooks asynchrones encore en
  cours quand la session se termine.
