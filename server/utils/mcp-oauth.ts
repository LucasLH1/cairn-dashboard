// Le serveur d'autorisation du connecteur MCP — fiche 0011, la partie pure.
//
// Un seul client, connu d'avance : Claude, identifié par `NUXT_MCP_CLIENT_ID`,
// public, sans secret, PKCE `S256` exigé. Une seule URL de rappel, celle des
// surfaces hébergées de Claude, comparée exactement. Tout ce qui s'écarte de
// cela est refusé, quelle que soit la formulation reçue.
//
// Ce module ne touche ni la requête, ni la base : les routes s'en servent, et
// les tests l'éprouvent par les cas qui doivent échouer.
import { createHash, randomBytes } from 'node:crypto'
import { LONGUEUR_MINIMALE_SECRET } from './mcp-jetons'

/** L'URL de rappel de Claude — claude.ai, Desktop, mobile et Cowork, la même. */
export const URL_RAPPEL_CLAUDE = 'https://claude.ai/api/mcp/auth_callback'

/** Les portées du connecteur. Le cadrage ne connaît que la lecture et l'écriture de `docs/`. */
export const PORTEES = ['docs:read', 'docs:write'] as const
export type Portee = typeof PORTEES[number]

/** Durée de vie d'un code d'autorisation : le temps d'un aller-retour, pas plus. */
export const DUREE_CODE_MS = 60_000

/** Chemin du serveur MCP, sous l'origine du dashboard. */
export const CHEMIN_MCP = '/mcp'

export type EtatConnecteur = 'ok' | 'client-absent' | 'secret-absent' | 'secret-trop-court'

function texte(valeur: unknown): string {
  return valeur === undefined || valeur === null ? '' : String(valeur).trim()
}

/**
 * Le connecteur est-il configurable ? Sans identifiant client ni secret de
 * signature, il ne peut rien délivrer : /health doit le dire, comme pour la
 * connexion (tranche 1b).
 */
export function etatConnecteur(config: { mcpClientId?: unknown, mcpSecret?: unknown }): EtatConnecteur {
  if (texte(config.mcpClientId) === '') return 'client-absent'
  const secret = texte(config.mcpSecret)
  if (secret === '') return 'secret-absent'
  if (secret.length < LONGUEUR_MINIMALE_SECRET) return 'secret-trop-court'
  return 'ok'
}

/** L'URI canonique du serveur MCP : l'origine servie, sans barre finale, et son chemin. */
export function ressourceCanonique(origine: string): string {
  return `${origine.replace(/\/+$/, '')}${CHEMIN_MCP}`
}

/** Vrai si `resource` désigne bien ce serveur — barre finale et casse de l'hôte tolérées. */
export function ressourceAttendue(resource: unknown, origine: string): boolean {
  const r = texte(resource)
  if (r === '') return false
  let u: URL
  try {
    u = new URL(r)
  }
  catch {
    return false
  }
  if (u.hash !== '' || u.search !== '') return false
  const attendue = new URL(ressourceCanonique(origine))
  return u.protocol === attendue.protocol
    && u.host.toLowerCase() === attendue.host.toLowerCase()
    && u.pathname.replace(/\/+$/, '') === attendue.pathname
}

/** Métadonnées de ressource protégée (RFC 9728), dérivées de l'origine servie. */
export function metadonneesRessource(origine: string) {
  const base = origine.replace(/\/+$/, '')
  return {
    resource: ressourceCanonique(base),
    authorization_servers: [base],
    scopes_supported: [...PORTEES],
    bearer_methods_supported: ['header'],
    resource_name: 'Cairn Dashboard — documentation de cairn-wms',
  }
}

/** Métadonnées du serveur d'autorisation (RFC 8414). Ni CIMD ni enregistrement dynamique. */
export function metadonneesAutorisation(origine: string) {
  const base = origine.replace(/\/+$/, '')
  return {
    issuer: base,
    authorization_endpoint: `${base}/oauth/autoriser`,
    token_endpoint: `${base}/oauth/jeton`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [...PORTEES],
  }
}

/** L'en-tête qui dit au client où s'autoriser, sur un 401. */
export function defiBearer(origine: string, options: { erreur?: string, portee?: string, description?: string } = {}): string {
  const base = origine.replace(/\/+$/, '')
  const parties = [
    options.erreur ? `error="${options.erreur}"` : null,
    options.description ? `error_description="${options.description.replace(/"/g, '')}"` : null,
    `resource_metadata="${base}/.well-known/oauth-protected-resource${CHEMIN_MCP}"`,
    options.portee ? `scope="${options.portee}"` : null,
  ].filter(Boolean)
  return `Bearer ${parties.join(', ')}`
}

// — La demande d'autorisation ————————————————————————————————————————————

export interface DemandeAutorisation {
  clientId: string
  redirectUri: string
  state: string | null
  codeChallenge: string
  resource: string
  portees: Portee[]
}

export type ErreurAutorisation
  = 'invalid_request' | 'invalid_client' | 'unauthorized_client' | 'unsupported_response_type' | 'invalid_scope' | 'invalid_target'

export type LectureDemande
  = | { ok: true, demande: DemandeAutorisation }
    | {
      ok: false
      erreur: ErreurAutorisation
      description: string
      /** Faux quand le client ou l'URL de rappel sont en cause : on ne redirige alors nulle part. */
      redirigeable: boolean
    }

/** Les portées demandées, ou toutes si rien n'est demandé ; nul si l'une est inconnue. */
export function lirePortees(scope: unknown): Portee[] | null {
  const brut = texte(scope)
  if (brut === '') return [...PORTEES]
  const demandees = [...new Set(brut.split(/\s+/))]
  if (demandees.some(p => !(PORTEES as readonly string[]).includes(p))) return null
  return demandees as Portee[]
}

const DEFI_S256 = /^[A-Za-z0-9_-]{43,128}$/

/**
 * Lit une demande d'autorisation, dans l'ordre que l'OAuth 2.1 impose : le
 * client et l'URL de rappel d'abord — s'ils sont faux, on ne redirige pas, on
 * refuse sur place —, puis le reste, dont les erreurs se renvoient au client.
 */
export function lireDemandeAutorisation(
  params: Record<string, unknown>,
  attendu: { clientId: string, origine: string },
): LectureDemande {
  const clientId = texte(params.client_id)
  if (clientId === '' || attendu.clientId === '' || clientId !== attendu.clientId) {
    return { ok: false, erreur: 'invalid_client', description: 'client inconnu', redirigeable: false }
  }

  const redirectUri = texte(params.redirect_uri)
  if (redirectUri !== URL_RAPPEL_CLAUDE) {
    return { ok: false, erreur: 'invalid_request', description: 'URL de rappel inconnue', redirigeable: false }
  }

  if (texte(params.response_type) !== 'code') {
    return { ok: false, erreur: 'unsupported_response_type', description: 'seul le code est pris en charge', redirigeable: true }
  }

  const codeChallenge = texte(params.code_challenge)
  if (texte(params.code_challenge_method) !== 'S256' || !DEFI_S256.test(codeChallenge)) {
    return { ok: false, erreur: 'invalid_request', description: 'PKCE S256 exigé', redirigeable: true }
  }

  if (!ressourceAttendue(params.resource, attendu.origine)) {
    return { ok: false, erreur: 'invalid_target', description: 'la ressource demandée n\'est pas ce serveur', redirigeable: true }
  }

  const portees = lirePortees(params.scope)
  if (portees === null) {
    return { ok: false, erreur: 'invalid_scope', description: 'portée inconnue', redirigeable: true }
  }

  const state = texte(params.state)
  return {
    ok: true,
    demande: {
      clientId,
      redirectUri,
      state: state === '' ? null : state,
      codeChallenge,
      resource: ressourceCanonique(attendu.origine),
      portees,
    },
  }
}

/** L'URL de retour vers le client, avec le code ou l'erreur, et l'état s'il y en avait un. */
export function urlDeRetour(redirectUri: string, params: Record<string, string | null>): string {
  const u = new URL(redirectUri)
  for (const [cle, valeur] of Object.entries(params)) {
    if (valeur !== null) u.searchParams.set(cle, valeur)
  }
  return u.toString()
}

// — PKCE ———————————————————————————————————————————————————————————————————

const VERIFICATEUR = /^[A-Za-z0-9\-._~]{43,128}$/

/** Vrai si le vérificateur produit bien le défi annoncé (S256). */
export function verifierPkce(codeVerifier: unknown, codeChallenge: string): boolean {
  const v = texte(codeVerifier)
  if (!VERIFICATEUR.test(v)) return false
  const calcule = createHash('sha256').update(v, 'ascii').digest('base64url')
  return calcule === codeChallenge
}

// — Les codes d'autorisation ————————————————————————————————————————————————

export interface CodeEmis {
  clientId: string
  redirectUri: string
  codeChallenge: string
  resource: string
  portees: Portee[]
  /** L'identifiant numérique GitHub du compte qui a consenti. */
  sujet: string
  expireA: number
}

export interface MagasinCodes {
  /** Émet un code à usage unique, valable une minute. */
  emettre: (details: Omit<CodeEmis, 'expireA'>) => string
  /** Rend ce que le code portait, et l'oublie — ou nul s'il est inconnu, déjà servi ou périmé. */
  consommer: (code: unknown) => CodeEmis | null
  taille: () => number
}

/**
 * Les codes vivent en mémoire : une minute, un seul usage, une seule instance
 * (fiche 0001). Un redémarrage les perd, et le parcours recommence — c'est
 * accepté par la fiche 0011.
 */
export function creerMagasinCodes(maintenant: () => number = () => Date.now()): MagasinCodes {
  const codes = new Map<string, CodeEmis>()

  function balayer() {
    const t = maintenant()
    for (const [code, details] of codes) {
      if (details.expireA <= t) codes.delete(code)
    }
  }

  return {
    emettre(details) {
      balayer()
      const code = randomBytes(24).toString('base64url')
      codes.set(code, { ...details, expireA: maintenant() + DUREE_CODE_MS })
      return code
    },
    consommer(code) {
      const c = texte(code)
      const details = codes.get(c)
      if (!details) return null
      codes.delete(c)
      return details.expireA <= maintenant() ? null : details
    },
    taille: () => codes.size,
  }
}

/** Le magasin partagé par le serveur : un seul, comme la base. */
let magasin: MagasinCodes | null = null

export function magasinCodes(): MagasinCodes {
  magasin ??= creerMagasinCodes()
  return magasin
}
