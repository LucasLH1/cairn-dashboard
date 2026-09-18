---
date: 2026-09-05 14:00
objectif: Spécifier les deux premiers modules du socle.
modules: ["0.1", "0.2"]
issues: [1, 2]
---

# Session du 2026-09-05 — spécification du socle

## Objectif

Rédiger les spécifications de 0.1 et 0.2, jusqu'à ce qu'aucune règle ne reste à deviner.

## Actions

- Rédigé 0.1 : sites, zones logistiques, cohabitation des donneurs d'ordre.
- Rédigé 0.2 : un code d'article est unique chez son donneur d'ordre, **pas globalement**.
- Écarté une piste : un catalogue commun à tous les donneurs d'ordre. Elle aurait mêlé leurs codes.

## Décisions

- Fiche 0001 : la première version couvre les couches 0 et 1.

## Fichiers touchés

| Chemin | Ce qui change |
|---|---|
| `docs/socle/0.1-sites-et-organisation.md` | Créé. |
| `docs/socle/0.2-catalogue-articles.md` | Créé. |
| `status.yml` | 0.1 et 0.2 passent à `spécifié`. |

## Issues liées

- #1, #2 — spécification rédigée.

## Points ouverts

- Un article peut-il changer d'unité de stockage ? Question portée par #21.
