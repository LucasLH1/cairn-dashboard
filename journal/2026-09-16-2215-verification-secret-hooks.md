---
date: 2026-09-16 22:15
objectif: Vérifier de bout en bout la rotation du secret des hooks, sans jamais exposer sa valeur, et cadrer la suite côté cairn-wms.
tranches: ["6"]
issues: [6]
---

# Session du 2026-09-16 — vérification du secret des hooks

## Objectif

Le secret des hooks venait d'être changé — côté Coolify (`NUXT_HOOKS_SECRET`) et côté poste
(`CAIRN_HOOKS_SECRET`), application redémarrée. Il fallait vérifier que la nouvelle valeur tient de
bout en bout : configuration du poste conforme, configuration versionnée sans secret, et un événement
réellement accepté en production — **sans jamais afficher la valeur du secret**. Puis reprendre les
points ouverts de la tranche 6.

## Actions

- **Vérifié `~/.claude/settings.json` sans l'ouvrir.** Le fichier n'a pas été lu tel quel — il porte
  le secret — mais parsé par un script qui n'émet que la structure et des longueurs. Résultat : JSON
  valide, droits `600` (`-rw-------`, propriétaire `lahay`), bloc `env` contenant `CAIRN_HOOKS_SECRET`
  (chaîne, longueur 60). Les autres clés racine sont des réglages Claude Code ordinaires.
- **Levé une ambiguïté Windows/WSL.** Le fichier actif est celui de **WSL** : `cairn-hooks` y est
  installé (`/home/lahay/.local/bin/cairn-hooks`, daté du 16/09, cohérent avec la tranche 6). Le
  `~/.claude/settings.json` **Windows** est obsolète (29/08) et ne porte pas le secret. Cette session,
  lancée côté Windows, n'avait d'ailleurs pas `CAIRN_HOOKS_SECRET` dans son environnement : lancée
  ainsi, elle n'émet rien.
- **Vérifié le `.claude/settings.json` du dépôt** : aucune modification non commitée, identique à
  `HEAD`, aucun motif sensible — il ne porte que la configuration des quatre hooks.
- **Éprouvé la porte des hooks en production**, secret lu depuis le fichier et jamais imprimé :
  - contrôle négatif (mauvais secret) → `401 {"echec":"secret-invalide"}` ;
  - positif (secret local) → `200 {"recu":true,"doublon":false}`.

  L'événement de test posé porte la clé `claude-code:verif-secret-1789589708` (`Stop`, dépôt
  `cairn-dashboard`, horodatage `2026-09-16T20:15:08.434Z`). Le secret local correspond donc bien au
  `NUXT_HOOKS_SECRET` de Coolify.
- **Documenté la contrainte WSL** dans `docs/hooks-claude-code.md` : les hooks n'émettent que depuis
  une session lancée dans WSL ; une session Windows ne trouve pas le script et reste muette.
- **Confirmé le comptage avant/après le déploiement de la tranche 6** (déjà fait, journal du 2130) :
  1 événement avant, 1 après — le même, `recu_le` inchangé, migrations `[1]` → `[1,2]`. L'historique
  a survécu au redéploiement.

## Décisions

Néant d'engageant — aucune fiche. Rappel appliqué, non tranché ici : le `.claude/settings.json` de
cairn-wms se pose **par une session dédiée à ce dépôt**
(fiche [`0008`](../docs/decisions/0008-reception-des-evenements-de-session.md)), donc rien n'y a été
versé depuis ici. Le contenu exact à poser est prêt, identique au `.claude/settings.json` de ce dépôt.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `journal/2026-09-16-2215-verification-secret-hooks.md` | Cette entrée. |
| `docs/hooks-claude-code.md` | Ajoute la contrainte : les hooks n'émettent que depuis une session lancée dans WSL. |

## Issues liées

- `#6` — commentée : vérification du secret et événement de test consignés.

## Points ouverts

- **Le `.claude/settings.json` de cairn-wms reste à poser**, par une session dédiée (fiche `0008`).
  Inchangé.
- **Premier événement réel dans le fil** : à observer dans l'UI (compte `LucasLH1`) une fois les hooks
  de cairn-wms actifs — non lisible depuis ici, le fil étant authentifié.
- **L'événement de test reste dans l'historique de production** (clé `verif-secret-1789589708`) : le
  dashboard n'a pas de suppression d'événement, il y demeurera. Assumé, signalé ici.
