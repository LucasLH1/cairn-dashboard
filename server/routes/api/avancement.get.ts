// L'avancement de cairn-wms — tranche 3.
//
// Lu dans son `status.yml`, sur la branche `dev`, à chaque affichage : rien
// n'est recopié. La lecture passe par le cache conditionnel, donc une
// consultation répétée ne consomme pas le quota.
//
// Un fichier illisible n'est jamais comblé par un avancement vide : il est
// signalé comme tel (issue #3).
import { analyserAvancement, compter, ErreurAvancement } from '../../utils/avancement'
import { BRANCHE, creerClient, interpreterErreur } from '../../utils/doc-github'
import { codeHttpPour } from '../../utils/echec-doc'

/** Le fichier de suivi de cairn-wms, à la racine de son dépôt. */
const SUIVI = 'status.yml'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const jeton = String(config.githubToken ?? '')
  const depot = String(config.githubRepo ?? '')

  if (!jeton || !depot) {
    event.node.res.statusCode = codeHttpPour('non-configure')
    return { echec: 'non-configure' }
  }

  let source: string

  try {
    source = await creerClient(jeton, depot, BRANCHE).brut(SUIVI)
  }
  catch (erreur) {
    const echec = interpreterErreur(erreur)
    event.node.res.statusCode = codeHttpPour(echec)
    return { echec }
  }

  try {
    const avancement = analyserAvancement(source)
    return {
      depot,
      branche: BRANCHE,
      ...avancement,
      compte: compter(avancement),
    }
  }
  catch (erreur) {
    // Le fichier a bien été lu : c'est sa forme qui ne convient pas.
    if (erreur instanceof ErreurAvancement) {
      event.node.res.statusCode = codeHttpPour('illisible')
      return { echec: 'illisible', raison: erreur.message }
    }
    throw erreur
  }
})
