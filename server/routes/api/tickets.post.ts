// Création d'un ticket dans cairn-wms — la première écriture du dashboard.
//
// C'est l'une des trois écritures que le cadrage autorise, et elle n'en ouvre
// aucune autre. Cinq remparts, dans cet ordre, avant qu'une ligne parte :
//
//   1. la session — le middleware l'exige déjà sur cette adresse ;
//   2. l'origine de la requête, qui doit être le dashboard lui-même ;
//   3. le jeton d'intention, qui empêche une seconde écriture identique ;
//   4. **la cohérence de l'organisation** : le serveur recalcule les labels et le
//      jalon à partir du module, et refuse si l'écran a annoncé autre chose —
//      plutôt que de poser en silence des labels que personne n'a vus ;
//   5. la validation du brouillon lui-même.
//
// Une écriture dupliquée ne serait pas rattrapable : le dashboard n'a le droit
// ni de modifier, ni de fermer, ni de commenter.
import { analyserAvancement } from '../../utils/avancement'
import { BRANCHE, creerClient } from '../../utils/doc-github'
import { creerAntiDoublon, jetonAcceptable, origineAcceptable } from '../../utils/ecriture'
import { codeHttpPour } from '../../utils/echec-doc'
import { construireOrganisation, verifierCoherence } from '../../utils/organisation'
import { interpreterEchecCreation, validerBrouillon } from '../../utils/tickets'
import { creerClientTickets } from '../../utils/tickets-github'

const SUIVI = 'status.yml'

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
  const lecteur = creerClient(jeton, depot, BRANCHE)

  let labelsExistants: string[]
  let organisation
  try {
    const [labels, jalons, suivi] = await Promise.all([
      client.labels(),
      client.jalons(),
      lecteur.brut(SUIVI),
    ])
    labelsExistants = labels
    organisation = construireOrganisation(analyserAvancement(suivi), labels, jalons)
  }
  catch (erreur) {
    const echec = interpreterEchecCreation(erreur)
    event.node.res.statusCode = echec === 'quota' ? 503 : 502
    return { echec }
  }

  const coherence = verifierCoherence(corps, organisation)
  if (!coherence.ok) {
    event.node.res.statusCode = 422
    return { echec: 'coherence', refus: coherence.refus, detail: coherence.detail }
  }

  // Les labels posés sont ceux que le serveur a déduits, jamais ceux reçus.
  const verdict = validerBrouillon(
    { titre: corps.titre, corps: corps.corps, labels: coherence.deduction.labels },
    labelsExistants,
  )
  if (!verdict.ok) {
    event.node.res.statusCode = 422
    return { echec: 'brouillon', refus: verdict.refus, detail: verdict.detail }
  }

  try {
    const cree = await client.creer(verdict.valeur, coherence.deduction.jalonNumero)
    antiDoublon.retenir(intention, cree)
    return { ...cree, deja: false, labels: verdict.valeur.labels, jalon: coherence.deduction.jalon }
  }
  catch (erreur) {
    const echec = interpreterEchecCreation(erreur)
    event.node.res.statusCode = echec === 'quota' ? 503 : echec === 'invalide' ? 422 : 502
    return { echec }
  }
})
