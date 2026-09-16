// La liste des tickets de cairn-wms, et de quoi la filtrer et créer.
//
// Tout part ensemble : des filtres qui proposeraient des labels inexistants
// seraient trompeurs, et un formulaire qui proposerait un module sans savoir à
// quelle couche il appartient créerait des tickets orphelins.
//
// La relation module → couche n'existe que dans le `status.yml` de cairn-wms :
// c'est pourquoi le suivi est lu ici aussi. Les quatre lectures passent par le
// cache et ne coûtent, la plupart du temps, aucun appel.
import { analyserAvancement } from '../../utils/avancement'
import { BRANCHE, creerClient, interpreterErreur } from '../../utils/doc-github'
import { codeHttpPour } from '../../utils/echec-doc'
import { construireOrganisation } from '../../utils/organisation'
import { rangerLabels } from '../../utils/tickets'
import { creerClientTickets } from '../../utils/tickets-github'

const SUIVI = 'status.yml'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const jeton = String(config.githubToken ?? '')
  const depot = String(config.githubRepo ?? '')

  if (!jeton || !depot) {
    event.node.res.statusCode = codeHttpPour('non-configure')
    return { echec: 'non-configure' }
  }

  try {
    const client = creerClientTickets(jeton, depot)
    const lecteur = creerClient(jeton, depot, BRANCHE)

    const [labels, jalons, tickets, suivi] = await Promise.all([
      client.labels(),
      client.jalons(),
      client.tickets(),
      lecteur.brut(SUIVI),
    ])

    // Un suivi illisible n'empêche pas de lister : seul le formulaire guidé en
    // dépend. On le dit, plutôt que de proposer une organisation devinée.
    let organisation = null
    try {
      organisation = construireOrganisation(analyserAvancement(suivi), labels, jalons)
    }
    catch {
      organisation = null
    }

    return { depot, familles: rangerLabels(labels), labels, tickets, organisation }
  }
  catch (erreur) {
    const echec = interpreterErreur(erreur)
    event.node.res.statusCode = codeHttpPour(echec)
    return { echec }
  }
})
