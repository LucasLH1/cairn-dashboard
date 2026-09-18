# Données fictives du développement local

Un faux cairn-wms, servi par `scripts/dev/faux-github.mjs` quand on lance `npm run dev:fictif`
(fiche [`0010`](../../../docs/decisions/0010-developpement-local-sur-donnees-fictives.md)).

**Tout est inventé.** Seule la **forme** est celle de cairn-wms, relevée à la source : `status.yml` en
couches et modules, en-tête YAML du journal, labels `couche/…` et `module/…`, jalons
« Couche N — … », arborescence de `docs/`. Le vocabulaire vient de son glossaire. Si cairn-wms change
de format, ces données doivent suivre : `test/faux-github.spec.ts` les passe au crible des mêmes
analyseurs que les vraies.

| Chemin | Ce que le dashboard en fait |
|---|---|
| `depot/` | Le contenu du dépôt : documentation, suivi, journal. Tout fichier ajouté ici est servi. |
| `tickets.json` | Labels, jalons et tickets. Une pull request y figure exprès : le dashboard doit l'écarter. |
| `fil.json` | Les événements qui amorcent le fil en direct, postés aux vraies routes de réception. |

Les modifier est le moyen de voir l'interface avec d'autres données. Un redémarrage de
`npm run dev:fictif` les relit.
