// Le point de jeton du connecteur — fiche 0011.
//
// Deux échanges, tous deux pour le seul client connu :
//
//   - un **code** contre un jeton d'accès et un jeton de rafraîchissement — le
//     code est consommé, PKCE vérifié, la ressource comparée, le compte revérifié ;
//   - un **jeton de rafraîchissement** contre les mêmes, tourné : l'ancien ne
//     vaut plus, et s'il se représente, toute sa famille est révoquée.
//
// Les erreurs sont celles de la RFC 6749, que Claude attend : `invalid_grant`
// quand un jeton ne vaut plus, jamais un code inventé. Le corps arrive en
// `application/x-www-form-urlencoded`, comme Claude l'envoie.
import { DUREE_RAFRAICHISSEMENT_JOURS, emettreJetonAcces, empreinte, nouveauJetonRafraichissement, nouvelleFamille } from '../../utils/mcp-jetons'
import { conserverRafraichissement, tournerRafraichissement } from '../../utils/base'
import { obtenirBase } from '../../utils/instance-base'
import { repondreJson } from '../../utils/reponse'

type ErreurJeton = 'invalid_request' | 'invalid_client' | 'invalid_grant' | 'invalid_scope' | 'invalid_target' | 'unsupported_grant_type' | 'server_error'

function refuser(event: Parameters<typeof repondreJson>[0], erreur: ErreurJeton, description: string): void {
  repondreJson(event, erreur === 'invalid_client' ? 401 : (erreur === 'server_error' ? 503 : 400), {
    error: erreur,
    error_description: description,
  })
}

function texte(valeur: unknown): string {
  return valeur === undefined || valeur === null ? '' : String(valeur).trim()
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (etatConnecteur(config) !== 'ok') {
    refuser(event, 'server_error', 'connecteur non configuré')
    return
  }

  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true })
  const origine = url.origin
  const clientAttendu = String(config.mcpClientId)
  const secret = String(config.mcpSecret)

  const corps = await readBody<Record<string, unknown>>(event).catch(() => null)
  if (!corps || typeof corps !== 'object') {
    refuser(event, 'invalid_request', 'corps illisible')
    return
  }

  if (texte(corps.client_id) !== clientAttendu) {
    refuser(event, 'invalid_client', 'client inconnu')
    return
  }

  const grant = texte(corps.grant_type)
  const maintenant = new Date()

  let sujet: string
  let portees: string[]
  let famille: string
  let audience: string

  if (grant === 'authorization_code') {
    const details = magasinCodes().consommer(corps.code)
    if (!details || details.clientId !== clientAttendu) {
      refuser(event, 'invalid_grant', 'code inconnu, déjà servi ou périmé')
      return
    }
    const redirectUri = texte(corps.redirect_uri)
    if (redirectUri !== '' && redirectUri !== details.redirectUri) {
      refuser(event, 'invalid_grant', 'URL de rappel différente de la demande')
      return
    }
    if (!verifierPkce(corps.code_verifier, details.codeChallenge)) {
      refuser(event, 'invalid_grant', 'vérificateur PKCE incorrect')
      return
    }
    const resource = texte(corps.resource)
    if (resource !== '' && !ressourceAttendue(resource, origine)) {
      refuser(event, 'invalid_target', 'la ressource demandée n\'est pas ce serveur')
      return
    }
    sujet = details.sujet
    portees = details.portees
    famille = nouvelleFamille()
    audience = details.resource
  }
  else if (grant === 'refresh_token') {
    const rotation = tournerRafraichissement(obtenirBase(config), empreinte(texte(corps.refresh_token)), maintenant)
    if (!rotation.ok || rotation.jeton.client !== clientAttendu) {
      refuser(event, 'invalid_grant', 'jeton de rafraîchissement inconnu, expiré ou déjà tourné')
      return
    }
    const demandees = lirePortees(corps.scope)
    if (demandees === null || demandees.some(p => !rotation.jeton.portees.includes(p))) {
      refuser(event, 'invalid_scope', 'portée hors de celles accordées')
      return
    }
    sujet = rotation.jeton.sujet
    portees = texte(corps.scope) === '' ? rotation.jeton.portees : demandees
    famille = rotation.jeton.famille
    audience = ressourceCanonique(origine)
  }
  else {
    refuser(event, 'unsupported_grant_type', 'seuls authorization_code et refresh_token sont pris en charge')
    return
  }

  // Le compte peut avoir changé depuis le consentement : on le revérifie ici
  // aussi, comme la session à chaque requête (tranche 1b).
  if (!estAutorise(Number(sujet), String(config.allowedGithubId ?? ''))) {
    refuser(event, 'invalid_grant', 'compte non autorisé')
    return
  }

  const acces = emettreJetonAcces({
    emetteur: origine,
    audience,
    sujet,
    client: clientAttendu,
    portees,
    secret,
    maintenantMs: maintenant.getTime(),
  })

  const rafraichissement = nouveauJetonRafraichissement()
  conserverRafraichissement(obtenirBase(config), {
    empreinte: empreinte(rafraichissement),
    famille,
    client: clientAttendu,
    sujet,
    portees,
    creeLe: maintenant.toISOString(),
    expireLe: new Date(maintenant.getTime() + DUREE_RAFRAICHISSEMENT_JOURS * 24 * 3600 * 1000).toISOString(),
  })

  repondreJson(event, 200, {
    access_token: acces.jeton,
    token_type: 'Bearer',
    expires_in: acces.expireDansS,
    refresh_token: rafraichissement,
    scope: portees.join(' '),
  })
})
