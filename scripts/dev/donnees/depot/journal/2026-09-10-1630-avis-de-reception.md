---
date: 2026-09-10 16:30
objectif: Spécifier l'avis de réception, et trancher le sort des réceptions sans attendu.
modules: ["1.1"]
issues: [5, 14, 15]
---

# Session du 2026-09-10 — avis de réception

## Objectif

Écrire la spécification de 1.1 jusqu'aux cas limites, et décider si une réception peut exister sans
attendu. Cette entrée est volontairement longue : elle éprouve l'affichage d'un journal qui défile.

## Actions

- Rédigé les concepts : attendu, ligne d'attendu, arrivage, rapprochement.
- Rédigé les règles de l'attendu (RG-AVR-001 à 005), de la réception (010 à 012) et de la clôture
  (020 et 021).
- Envisagé de refuser toute réception sans attendu. **Écarté** : les arrivages imprévus sont courants,
  et les refuser bloquerait les quais. La piste est consignée dans « Décisions écartées ».
- Rédigé le paramétrage : réception aveugle, tolérance de surplus, délai de retard, clôture
  automatique.
- Ajouté cinq cas limites, dont l'attendu reçu en deux arrivages et le numéro de série reçu deux fois.
- Ouvert #14 : une quantité attendue négative passait la validation de l'échange de données.
- Ouvert #15 : le comportement d'un attendu partiellement reçu à la clôture n'est pas tranché.

## Décisions

- Une réception peut exister sans attendu ; elle est rapprochée après coup (RG-AVR-011).
- Un surplus est accepté et signalé, jamais refusé (RG-AVR-012).

## Fichiers touchés

| Chemin | Ce qui change |
|---|---|
| `docs/flux-entrants/1.1-avis-de-reception.md` | Créé. |
| `status.yml` | 1.1 passe à `spécifié`. |

## Issues liées

- #5 — spécification rédigée ; la réalisation peut commencer.
- #14, #15 — ouvertes.

## Points ouverts

- #15 reste à trancher avant la réalisation de la clôture.
- Faut-il un délai de retard par donneur d'ordre ?
