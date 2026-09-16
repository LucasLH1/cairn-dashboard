// La liste des tickets de cairn-wms, et les labels qui servent à la filtrer.
//
// Les deux partent ensemble : des filtres qui proposeraient des labels
// inexistants, ou qui manqueraient ceux du dépôt, seraient trompeurs. Le
// filtrage lui-même se fait dans l'interface, sans rappeler GitHub — la liste
// entière tient largement dans une page.
import { interpreterErreur } from '../../utils/doc-github'
import { codeHttpPour } from '../../utils/echec-doc'
import { rangerLabels } from '../../utils/tickets'
import { creerClientTickets } from '../../utils/tickets-github'

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
    const [labels, tickets] = await Promise.all([client.labels(), client.tickets()])

    return {
      depot,
      familles: rangerLabels(labels),
      labels,
      tickets,
    }
  }
  catch (erreur) {
    const echec = interpreterErreur(erreur)
    event.node.res.statusCode = codeHttpPour(echec)
    return { echec }
  }
})
