// Le journal de cairn-wms — tranche 5.
//
// Les entrées sont lues à la source, dans `journal/` de son dépôt, sur `dev`.
// Leur format est le sien (`server/utils/journal-wms.ts`) : `modules` et non
// `tranches`, et des champs que nous ne connaissons pas sont conservés.
//
// Seules les plus récentes sont lues : chaque entrée coûte une lecture, et le
// dossier grandira. Les lectures passent par le cache conditionnel.
import { BRANCHE, creerClient, interpreterErreur } from '../../utils/doc-github'
import { codeHttpPour } from '../../utils/echec-doc'
import {
  analyserEntree,
  citations,
  estUneEntree,
  filtrer,
  RACINE,
  trier,
} from '../../utils/journal-wms'

/** Combien d'entrées on lit au plus. Au-delà, le coût en appels n'en vaut pas la peine. */
const ENTREES_MAXIMUM = 20

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const jeton = String(config.githubToken ?? '')
  const depot = String(config.githubRepo ?? '')

  if (!jeton || !depot) {
    event.node.res.statusCode = codeHttpPour('non-configure')
    return { echec: 'non-configure' }
  }

  const requete = getQuery(event)
  const module = String(requete.module ?? '') || null
  const issueDemandee = Number(requete.issue ?? Number.NaN)
  const issue = Number.isInteger(issueDemandee) ? issueDemandee : null

  try {
    const client = creerClient(jeton, depot, BRANCHE)

    const noms = (await client.arbre())
      .filter(e => e.type === 'blob')
      .map(e => e.path)
      .filter(chemin => chemin.startsWith(`${RACINE}/`))
      .map(chemin => chemin.slice(RACINE.length + 1))
      // Le nommage fait le tri : `README.md` et tout autre document sont écartés.
      .filter(estUneEntree)
      .sort((a, b) => b.localeCompare(a, 'fr'))
      .slice(0, ENTREES_MAXIMUM)

    const lues = await Promise.all(
      noms.map(async nom => analyserEntree(await client.brut(`${RACINE}/${nom}`), nom)),
    )

    // Le corps est rendu par le serveur, comme la documentation (fiche 0004) :
    // le HTML brut d'une entrée n'est jamais émis, et les liens relatifs d'une
    // entrée pointent vers le dépôt, non vers nos écrans — ils sont donc
    // traités comme externes, et neutralisés.
    const entrees = trier(lues).map(entree => ({
      ...entree,
      html: rendreMarkdown(entree.corps, `journal/${entree.fichier}`),
    }))

    return {
      depot,
      branche: BRANCHE,
      entrees: filtrer(entrees, { module, issue }),
      total: entrees.length,
      citations: citations(entrees),
    }
  }
  catch (erreur) {
    const echec = interpreterErreur(erreur)
    event.node.res.statusCode = codeHttpPour(echec)
    return { echec }
  }
})
