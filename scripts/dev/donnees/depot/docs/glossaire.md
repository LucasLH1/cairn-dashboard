# Glossaire métier — Cairn WMS (données fictives)

Un terme, un sens. Les définitions ci-dessous sont **fictives** : elles servent à éprouver l'affichage
d'un long tableau.

## Organisation

| Français | Anglais | Définition |
|---|---|---|
| Prestataire | `Provider` | L'exploitant du WMS : il détient les sites, emploie les opérateurs et facture ses prestations. |
| Donneur d'ordre | `Principal` | L'entité qui confie de la marchandise au prestataire. Elle possède du stock, jamais d'emplacement. |
| Site | `Site` | Un lieu physique exploité par le prestataire, doté d'une adresse postale. |
| Zone logistique | `Zone` | Découpage d'un site : bâtiment, cellule, mezzanine, quai, zone de quarantaine. |

## Emplacements

| Français | Anglais | Définition |
|---|---|---|
| Emplacement | `Location` | La plus petite adresse physique où du stock peut se trouver. |
| Allée | `Aisle` | Suite d'emplacements desservie par un même passage. |
| Masque d'adresse | `AddressMask` | Règle de composition de l'adresse lisible d'un emplacement, par exemple `A-03-2-B`. |

## Flux entrants

| Français | Anglais | Définition |
|---|---|---|
| Arrivage | `Arrival` | La présentation physique d'un véhicule à un quai. |
| Attendu | `ExpectedReceipt` | Ce que le donneur d'ordre annonce avant l'arrivée de la marchandise. |
| Réception | `Receipt` | La prise en charge contradictoire de la marchandise, ligne à ligne. |
| Unité logistique | `HandlingUnit` | Un support identifié qui porte de la marchandise : palette, bac, colis. |

## Termes proscrits

- « Magasin », pour désigner un site : ambigu avec le commerce de détail.
- « Article en stock », pour désigner une quantité : on parle de **stock d'un article**.
