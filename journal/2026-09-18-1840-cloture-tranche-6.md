---
date: 2026-09-18 18:40
objectif: Faire le point sur la tranche 6 après sa mise en ligne, obtenir le premier événement réel, et la clore.
tranches: ["6"]
issues: [6]
---

# Session du 2026-09-18 — clôture de la tranche 6

## Objectif

La tranche 6 était déployée depuis le 16 (`e120a90`), mais sa condition de livraison restait ouverte :
**un premier événement réel dans le fil**, issu d'une vraie session, sur le poste. La session devait
vérifier que tout était en place, puis clore. Elle a surtout révélé que **rien n'avait jamais
fonctionné** côté poste.

## Actions

### Le secret : une fuite évitée, puis neutralisée

- **Le 16 au soir, le secret a été collé dans le mauvais fichier** : le `.claude/settings.json` versionné
  du dépôt, qui est public, au lieu du `~/.claude/settings.json` du poste. Le fichier en devenait du
  JSON invalide, et les hooks de ce dépôt illisibles.
- **Pris avant tout commit.** Vérifié sans afficher la valeur : zéro occurrence dans le commit, dans
  tout l'historique, dans l'index. Le fichier a été restauré depuis le commit.
- **Le secret a ensuite été régénéré**, côté Coolify et côté poste (entrée du 16 à 22:15). **La
  révocation est prouvée aujourd'hui** : la valeur qui avait transité par la conversation est refusée
  en production, `401 secret-invalide`. La valeur actuelle en diffère, et s'authentifie.
- **Le secret est désormais au bon endroit** : section `env` de `~/.claude/settings.json`, droits `600`,
  aucun bloc `hooks` dans les réglages utilisateur.

### Un second redéploiement, et l'historique tient encore

Le changement de secret dans Coolify a relancé le conteneur le 16 à 20:02. L'événement écrit le 16 à
15:13 est toujours là : il a survécu à **deux** remplacements de conteneur.

### Le script installé était inerte depuis le premier jour

- **Le symptôme.** Ni la session de contrôle ouverte sur cairn-wms, ni cette session-ci n'émettaient,
  alors que le secret était visible, le script installé, et la configuration des deux dépôts correcte.
- **Le diagnostic, par élimination et par mesure.** Copie locale de cairn-wms à jour ; session bien
  lancée dans WSL ; aucun compteur créé — le script, qui l'incrémente avant d'envoyer, n'avait donc
  jamais atteint ce point. La commande exacte du hook, rejouée à la main vers un port fermé, ne
  faisait rien non plus : la chaîne cassait sur le poste même.
- **La cause.** La dernière ligne du script ne lançait le travail que si le programme s'appelait
  `cairn-hooks.mjs`. L'installateur le copie sous `cairn-hooks`, sans extension. **Prouvé par les mêmes
  octets sous deux noms** : seule la copie nommée `.mjs` crée un compteur.
- **Pourquoi les tests ne l'ont pas vu** : ils lançaient le fichier du dépôt, qui portait le bon nom.
  Ils éprouvaient **le mauvais artefact**.
- **Le correctif** (`e537365`) compare les chemins réels, plus les noms. Un nouveau test exécute
  l'installateur dans une maison temporaire, puis lance la copie installée directement, comme le fait
  le hook. **Remis face à l'ancien garde-fou, ce test seul échoue** — il attrape bien le défaut.
- **Deux défauts voisins, corrigés au passage.** Les tests écrivaient dans le vrai
  `~/.local/state/cairn-hooks` du poste : leurs fixtures ont failli passer pour des sessions réelles.
  Ils isolent désormais leur état. Et l'événement de test posé en production par la session du 16 à
  22:15 y demeure, faute de suppression — il porte la session `verif-secret-hooks`.

### Le premier événement réel, puis les suivants

Dans les minutes qui ont suivi la réinstallation :

| Heure | Dépôt | Événement | Session |
|---|---|---|---|
| 16:31:09 | cairn-wms | `Stop` | la session de contrôle, `23613e99` |
| 16:34:24 | cairn-dashboard | `Stop` | cette session, `330a3cea` |
| 16:36:46 → 48 | cairn-dashboard | trois `PostToolUse`, `Edit` | cette session |

Ce que ces cinq événements prouvent, **en production et sur de vraies sessions** :

- **les deux dépôts émettent** ;
- **trois modifications en deux secondes sont toutes conservées** : clés tirées de `tool_use_id`,
  aucune confusion — le cas précis qui avait fait amender la fiche `0009` ;
- **les nombreux appels `Bash` n'ont rien émis** : le filtre `Edit|Write|NotebookEdit` tient ;
- **les cinq charges se limitent aux huit champs** de la liste blanche.

### La carte « Ce qui vient ensuite »

Elle annonçait encore la tranche 6 comme à venir. La ligne est retirée ; les quatre captures jointes à
la tranche ont été **refaites** pour montrer l'écran tel qu'il est désormais, fil alimenté par la copie
installée du script.

### Mes erreurs de la session

- **J'ai d'abord conclu que tout était correct**, sur la foi de la configuration, sans avoir vu un seul
  événement réel passer. La configuration l'était ; le script ne l'était pas.
- **Un contrôle de diagnostic a donné une fausse négative** : il cherchait le compteur sous son nom
  brut, alors que le script remplace les caractères hors `[A-Za-z0-9_-]`. Le fichier était là, sous
  un autre nom. Relevé et corrigé avant de conclure.

## Décisions

Aucune décision engageante, aucune fiche. Deux choix, à relire :

- **Éprouver l'artefact installé, pas seulement le fichier du dépôt.** C'est la leçon de la session :
  un test qui n'exerce pas ce qui tourne réellement ne prouve rien de ce qui tourne réellement.
- **Refaire les captures** plutôt que signaler l'écart : une preuve visuelle qui montre un état
  périmé n'en est plus une.

## Fichiers touchés

| Chemin | Ce qui change et pourquoi |
|---|---|
| `scripts/hooks/cairn-hooks.mjs` | Le garde-fou compare les chemins réels, plus les noms. |
| `test/hooks-script.spec.ts` | Éprouve la copie installée ; isole l'état des tests. 295 tests. |
| `app/pages/index.vue` | La tranche 6 ne figure plus parmi ce qui vient ensuite. |
| `journal/captures/2026-09-16-tranche-6/` | Les quatre captures, refaites. |
| `status.yml` | Tranche 6 livrée. |

## Issues liées

- `#6` — tranche 6, close par cette session.

## Points ouverts

- **`main` porte encore le script inerte** jusqu'à la fusion de la pull request qui suit. Sans effet sur
  le fonctionnement — l'installation se fait depuis la copie locale, sur `dev` —, mais `main` doit
  refléter ce qui tourne.
- **Aucun `SessionStart` ni `SessionEnd` n'a encore été vu en production** : les deux sessions qui ont
  émis étaient déjà ouvertes avant le correctif. Éprouvés en local et par les tests ; à constater à
  la prochaine session ouverte, et `SessionEnd` peut manquer à l'extinction.
- **L'événement de test `verif-secret-hooks` reste dans l'historique** : le dashboard n'a pas de
  suppression.
- **Le `.claude/settings.json` de cairn-wms est sur sa branche `dev`**, pas encore sur `main`. Sans
  effet sur les hooks, qui se lisent dans la copie de travail ; c'est l'affaire de ce dépôt.
