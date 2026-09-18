# Cairn WMS — Spécification métier (données fictives)

> Ce document est **fictif**. Il reprend la forme de la documentation de cairn-wms pour le
> développement local du dashboard ; aucune règle qu'il énonce n'engage le produit.

Ce dépôt documentaire décrit **le métier** du WMS Cairn. Il ne contient aucune décision technique.

## Conventions de lecture

**Règles de gestion.** Chaque règle porte un identifiant stable de la forme `RG-XXX-nnn`, où `XXX`
identifie le module. Une règle est atomique, vérifiable, et formulée à l'indicatif.

| Préfixe | Module |
|---|---|
| `RG-SIT` | 0.1 Sites et organisation |
| `RG-CAT` | 0.2 Catalogue articles |
| `RG-ADR` | 0.3 Adressage des emplacements |
| `RG-ULO` | 0.4 Unités logistiques |
| `RG-AVR` | 1.1 Avis de réception |
| `RG-CQR` | 1.2 Contrôle qualité à réception |
| `RG-RGD` | 1.3 Rangement guidé |
| `RG-REA` | 2.1 Réapprovisionnement interne |

## Carte des modules

| Couche | Modules |
|---|---|
| 0 — Socle transverse | 0.1 Sites et organisation · 0.2 Catalogue articles · 0.3 Adressage des emplacements · 0.4 Unités logistiques |
| 1 — Flux entrants | 1.1 Avis de réception · 1.2 Contrôle qualité à réception · 1.3 Rangement guidé |
| 2 — Cœur stock | 2.1 Réapprovisionnement interne · 2.2 Inventaire tournant · 2.3 Lots et dates de péremption |
| 3 — Flux sortants | 3.1 Vagues de préparation · 3.2 Colisage et étiquetage |
| 4 — Pilotage | 4.1 Indicateurs d'activité |

Le vocabulaire est celui du [glossaire](glossaire.md). Les décisions métier sont dans
[`decisions/`](decisions/README.md).
