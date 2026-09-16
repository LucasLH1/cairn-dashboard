// L'arborescence de la documentation de cairn-wms — tranche 2.
//
// Rien n'est conservé : l'arbre est relu à chaque appel, pour qu'une
// modification poussée sur `dev` soit visible sans redéployer le dashboard.
import { BRANCHE, creerClient, interpreterErreur, organiserArbre } from '../../../utils/doc-github'
import { codeHttpPour } from '../../../utils/echec-doc'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const jeton = String(config.githubToken ?? '')
  const depot = String(config.githubRepo ?? '')

  if (!jeton || !depot) {
    event.node.res.statusCode = codeHttpPour('non-configure')
    return { echec: 'non-configure' }
  }

  try {
    const client = creerClient(jeton, depot, BRANCHE)
    return { depot, branche: BRANCHE, groupes: organiserArbre(await client.arbre()) }
  }
  catch (erreur) {
    const echec = interpreterErreur(erreur)
    event.node.res.statusCode = codeHttpPour(echec)
    return { echec }
  }
})
