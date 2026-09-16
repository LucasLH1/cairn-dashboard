// Réception des webhooks GitHub de cairn-wms — tranche 5.
//
// **La seule porte publique du dashboard** : GitHub n'a pas de session. Tout
// repose donc sur ce qui suit, dans cet ordre — du moins cher au plus cher :
//
//   1. la **taille** annoncée, refusée avant toute lecture du corps ;
//   2. les **en-têtes** obligatoires : livraison et événement ;
//   3. l'**événement**, qui doit figurer dans la liste fermée ;
//   4. la **signature** HMAC-SHA256, comparée à temps constant ;
//   5. la **livraison déjà reçue**, que la contrainte de base rejette.
//
// Une livraison déjà connue rend un succès : GitHub réémet quand il n'obtient
// pas de réponse, et un échec le ferait réessayer sans fin.
import { enregistrer } from '../../utils/base'
import { diffuser } from '../../utils/diffusion'
import { obtenirBase } from '../../utils/instance-base'
import { evenementRetenu, resumer, signatureValide, TAILLE_MAXIMALE } from '../../utils/webhook'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const secret = String(config.webhookSecret ?? '')

  if (!secret) {
    // Sans secret, aucune livraison ne peut être vérifiée : on refuse tout
    // plutôt que d'accepter n'importe quoi.
    event.node.res.statusCode = 503
    return { echec: 'non-configure' }
  }

  const annoncee = Number(getHeader(event, 'content-length') ?? 0)
  if (Number.isFinite(annoncee) && annoncee > TAILLE_MAXIMALE) {
    event.node.res.statusCode = 413
    return { echec: 'trop-gros' }
  }

  const livraison = String(getHeader(event, 'x-github-delivery') ?? '')
  const type = String(getHeader(event, 'x-github-event') ?? '')

  if (!livraison) {
    event.node.res.statusCode = 400
    return { echec: 'livraison-absente' }
  }

  if (!type) {
    event.node.res.statusCode = 400
    return { echec: 'evenement-absent' }
  }

  const brut = await readRawBody(event, 'utf8')
  const corps = typeof brut === 'string' ? brut : ''

  if (corps.length > TAILLE_MAXIMALE) {
    event.node.res.statusCode = 413
    return { echec: 'trop-gros' }
  }

  // La signature est vérifiée avant toute interprétation du corps : on ne lit
  // pas ce qu'on n'a pas authentifié.
  if (!signatureValide(corps, getHeader(event, 'x-hub-signature-256'), secret)) {
    event.node.res.statusCode = 401
    return { echec: 'signature-invalide' }
  }

  // Événement hors liste : accepté poliment, et ignoré. GitHub n'a pas à
  // distinguer « refusé » de « pas retenu », et un échec le ferait réessayer.
  if (!evenementRetenu(type)) {
    return { ignore: true, type }
  }

  let charge: Record<string, unknown>
  try {
    const lu = JSON.parse(corps)
    charge = (typeof lu === 'object' && lu !== null && !Array.isArray(lu)) ? lu as Record<string, unknown> : {}
  }
  catch {
    event.node.res.statusCode = 400
    return { echec: 'corps-illisible' }
  }

  const resume = resumer(type, charge)
  const recuLe = new Date().toISOString()

  const enregistrement = enregistrer(obtenirBase(config), {
    livraison,
    source: 'github',
    type,
    action: resume.action,
    depot: resume.depot,
    auteur: resume.auteur,
    titre: resume.titre,
    url: resume.url,
    recuLe,
    charge: corps,
  })

  if (enregistrement === 'doublon') {
    // Réémission : rien à faire, et surtout rien à diffuser deux fois.
    return { recu: true, doublon: true }
  }

  diffuser({
    sorte: 'evenement',
    evenement: { livraison, source: 'github', type, ...resume, recuLe },
  })

  return { recu: true, doublon: false }
})
