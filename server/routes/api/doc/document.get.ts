// Un document de la documentation de cairn-wms, rendu en HTML — tranche 2.
//
// Le chemin est vérifié avant tout appel : il doit rester dans `docs/`, et
// désigner un document Markdown. Le rendu suit la fiche 0004 — aucun HTML brut
// n'est exécuté, les liens externes sont neutralisés.
import {
  BRANCHE,
  cheminSur,
  creerClient,
  ErreurDoc,
  interpreterErreur,
  nomDepuisChemin,
} from '../../../utils/doc-github'
import { codeHttpPour } from '../../../utils/echec-doc'
import { rendreMarkdown } from '../../../utils/markdown'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const jeton = String(config.githubToken ?? '')
  const depot = String(config.githubRepo ?? '')

  if (!jeton || !depot) {
    event.node.res.statusCode = codeHttpPour('non-configure')
    return { echec: 'non-configure' }
  }

  const chemin = String(getQuery(event).chemin ?? '')

  if (!cheminSur(chemin)) {
    event.node.res.statusCode = codeHttpPour('absent')
    return { echec: 'absent' }
  }

  try {
    const client = creerClient(jeton, depot, BRANCHE)
    const source = await client.fichier(chemin)

    return {
      chemin,
      nom: nomDepuisChemin(chemin),
      branche: BRANCHE,
      html: rendreMarkdown(source, chemin),
    }
  }
  catch (erreur) {
    const echec = erreur instanceof ErreurDoc ? erreur.echec : interpreterErreur(erreur)
    event.node.res.statusCode = codeHttpPour(echec)
    return { echec }
  }
})
