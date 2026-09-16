// Réception des événements des sessions Claude Code — tranche 6, fiches 0008 et 0009.
//
// La seconde porte publique du dashboard, après celle des webhooks. Six
// remparts, du moins cher au plus cher :
//
//   1. la **taille** annoncée, refusée avant toute lecture ;
//   2. le **secret**, présent puis comparé à temps constant — avant de lire le
//      corps : on n'interprète pas ce qu'on n'a pas authentifié ;
//   3. le **débit**, une fois l'émetteur reconnu ;
//   4. le **corps**, qui doit être du JSON ;
//   5. le **message**, reconstruit champ par champ depuis une liste blanche ;
//   6. la **clé**, qu'une contrainte de base rejette si elle est déjà connue.
//
// Contrairement aux webhooks GitHub, un hook ne réémet jamais : un refus ne
// déclenche aucune tentative supplémentaire, et peut donc être franc.
import { enregistrer } from '../../utils/base'
import { diffuser } from '../../utils/diffusion'
import {
  autoriserDebit,
  lireMessage,
  secretValide,
  TAILLE_MAXIMALE,
  titrePour,
} from '../../utils/hooks'
import { obtenirBase } from '../../utils/instance-base'

/** L'en-tête qui porte le secret. Explicite, pour ne se confondre avec aucune session. */
export const EN_TETE_SECRET = 'x-cairn-hooks-secret'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const secret = String(config.hooksSecret ?? '')

  if (!secret) {
    // Sans secret configuré, rien ne peut être vérifié : on refuse tout plutôt
    // que d'accepter n'importe quoi.
    event.node.res.statusCode = 503
    return { echec: 'non-configure' }
  }

  const annoncee = Number(getHeader(event, 'content-length') ?? 0)
  if (Number.isFinite(annoncee) && annoncee > TAILLE_MAXIMALE) {
    event.node.res.statusCode = 413
    return { echec: 'trop-gros' }
  }

  const porte = getHeader(event, EN_TETE_SECRET)
  if (porte === undefined || porte === '') {
    event.node.res.statusCode = 401
    return { echec: 'secret-absent' }
  }

  if (!secretValide(porte, secret)) {
    event.node.res.statusCode = 401
    return { echec: 'secret-invalide' }
  }

  // Le débit se compte **après** l'authentification : sinon un flot anonyme
  // remplirait la fenêtre et ferait taire les vrais événements.
  if (!autoriserDebit()) {
    event.node.res.statusCode = 429
    return { echec: 'trop-rapide' }
  }

  const brut = await readRawBody(event, 'utf8')
  const corps = typeof brut === 'string' ? brut : ''

  if (corps.length > TAILLE_MAXIMALE) {
    event.node.res.statusCode = 413
    return { echec: 'trop-gros' }
  }

  let lu: unknown
  try {
    lu = JSON.parse(corps)
  }
  catch {
    event.node.res.statusCode = 400
    return { echec: 'corps-illisible' }
  }

  const lecture = lireMessage(lu)
  if (!lecture.ok) {
    event.node.res.statusCode = 422
    return { echec: lecture.refus }
  }

  const message = lecture.message
  const recuLe = new Date().toISOString()

  const enregistrement = enregistrer(obtenirBase(config), {
    livraison: message.cle,
    source: 'claude-code',
    session: message.session,
    type: message.evenement,
    action: message.motif,
    depot: message.depot,
    auteur: message.agent,
    titre: titrePour(message),
    url: null,
    recuLe,
    // **Le message reconstruit, et non le corps reçu.** La fiche 0008 fait lire
    // le corps plutôt que le recopier ; conserver ce qu'on a lu est le seul
    // moyen qu'un champ ajouté par une version future n'entre jamais en base.
    charge: JSON.stringify(message),
  })

  if (enregistrement === 'doublon') {
    return { recu: true, doublon: true }
  }

  diffuser({
    sorte: 'evenement',
    evenement: {
      livraison: message.cle,
      source: 'claude-code',
      session: message.session,
      type: message.evenement,
      action: message.motif,
      depot: message.depot,
      auteur: message.agent,
      titre: titrePour(message),
      url: null,
      recuLe,
    },
  })

  return { recu: true, doublon: false }
})
