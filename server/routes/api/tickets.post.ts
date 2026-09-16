// Création d'un ticket dans cairn-wms — la première écriture du dashboard.
//
// C'est l'une des trois écritures que le cadrage autorise, et elle n'en ouvre
// aucune autre. Quatre remparts, dans cet ordre, avant qu'une ligne parte chez
// GitHub :
//
//   1. la session — le middleware l'exige déjà sur cette adresse ;
//   2. l'origine de la requête, qui doit être le dashboard lui-même ;
//   3. le jeton d'intention, qui empêche une seconde écriture identique ;
//   4. la validation du brouillon, labels compris, contre les labels réels.
//
// Une écriture dupliquée ne serait pas rattrapable : le dashboard n'a le droit
// ni de modifier, ni de fermer, ni de commenter.
import { creerAntiDoublon, jetonAcceptable, origineAcceptable } from '../../utils/ecriture'
import { codeHttpPour } from '../../utils/echec-doc'
import { interpreterEchecCreation, validerBrouillon } from '../../utils/tickets'
import { creerClientTickets } from '../../utils/tickets-github'

interface Cree {
  numero: number
  url: string
}

// Partagé par toutes les requêtes du serveur, et perdu au redéploiement : une
// intention ne vaut que pour la visite en cours.
const antiDoublon = creerAntiDoublon<Cree>()

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const jeton = String(config.githubToken ?? '')
  const depot = String(config.githubRepo ?? '')

  if (!jeton || !depot) {
    event.node.res.statusCode = codeHttpPour('non-configure')
    return { echec: 'non-configure' }
  }

  if (!origineAcceptable(getHeader(event, 'origin'), getHeader(event, 'host'))) {
    event.node.res.statusCode = 403
    return { echec: 'origine' }
  }

  const corps = await readBody(event).catch(() => null) as Record<string, unknown> | null
  if (corps === null) {
    event.node.res.statusCode = 400
    return { echec: 'illisible' }
  }

  const intention = String(corps.intention ?? '')
  if (!jetonAcceptable(intention)) {
    event.node.res.statusCode = 400
    return { echec: 'intention' }
  }

  // Deuxième envoi de la même intention : on rend ce qui a été fait, sans écrire.
  const deja = antiDoublon.deja(intention)
  if (deja) return { ...deja, deja: true }

  const client = creerClientTickets(jeton, depot)

  let labelsExistants: string[]
  try {
    labelsExistants = await client.labels()
  }
  catch (erreur) {
    const echec = interpreterEchecCreation(erreur)
    event.node.res.statusCode = echec === 'quota' ? 503 : 502
    return { echec }
  }

  const verdict = validerBrouillon(corps, labelsExistants)
  if (!verdict.ok) {
    event.node.res.statusCode = 422
    return { echec: 'brouillon', refus: verdict.refus, detail: verdict.detail }
  }

  try {
    const cree = await client.creer(verdict.valeur)
    antiDoublon.retenir(intention, cree)
    return { ...cree, deja: false }
  }
  catch (erreur) {
    const echec = interpreterEchecCreation(erreur)
    event.node.res.statusCode = echec === 'quota' ? 503 : echec === 'invalide' ? 422 : 502
    return { echec }
  }
})
