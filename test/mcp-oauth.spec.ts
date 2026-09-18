// Le serveur d'autorisation du connecteur, partie pure — fiche 0011.
// Éprouvé surtout par ce qui doit échouer.
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  creerMagasinCodes,
  defiBearer,
  DUREE_CODE_MS,
  etatConnecteur,
  lireDemandeAutorisation,
  lirePortees,
  metadonneesAutorisation,
  metadonneesRessource,
  PORTEES,
  ressourceAttendue,
  ressourceCanonique,
  URL_RAPPEL_CLAUDE,
  urlDeRetour,
  verifierPkce,
} from '../server/utils/mcp-oauth'

const ORIGINE = 'https://dashboard.example'
const CLIENT = 'claude-cairn'
const VERIFICATEUR = 'a'.repeat(50)
const DEFI = createHash('sha256').update(VERIFICATEUR, 'ascii').digest('base64url')

function demande(surcharge: Record<string, unknown> = {}) {
  return {
    client_id: CLIENT,
    redirect_uri: URL_RAPPEL_CLAUDE,
    response_type: 'code',
    code_challenge: DEFI,
    code_challenge_method: 'S256',
    resource: `${ORIGINE}/mcp`,
    state: 'etat-1',
    ...surcharge,
  }
}

describe('la configuration du connecteur', () => {
  it('exige l\'identifiant client et un secret assez long', () => {
    expect(etatConnecteur({})).toBe('client-absent')
    expect(etatConnecteur({ mcpClientId: 'c' })).toBe('secret-absent')
    expect(etatConnecteur({ mcpClientId: 'c', mcpSecret: 'court' })).toBe('secret-trop-court')
    expect(etatConnecteur({ mcpClientId: 'c', mcpSecret: 'x'.repeat(32) })).toBe('ok')
  })
})

describe('la ressource', () => {
  it('est l\'origine servie et le chemin du serveur MCP', () => {
    expect(ressourceCanonique(ORIGINE)).toBe(`${ORIGINE}/mcp`)
    expect(ressourceCanonique(`${ORIGINE}/`)).toBe(`${ORIGINE}/mcp`)
  })

  it('tolère la barre finale et la casse de l\'hôte, rien d\'autre', () => {
    expect(ressourceAttendue(`${ORIGINE}/mcp`, ORIGINE)).toBe(true)
    expect(ressourceAttendue(`${ORIGINE}/mcp/`, ORIGINE)).toBe(true)
    expect(ressourceAttendue('https://DASHBOARD.example/mcp', ORIGINE)).toBe(true)
    expect(ressourceAttendue(ORIGINE, ORIGINE)).toBe(false)
    expect(ressourceAttendue(`${ORIGINE}/mcp?x=1`, ORIGINE)).toBe(false)
    expect(ressourceAttendue(`${ORIGINE}/mcp#f`, ORIGINE)).toBe(false)
    expect(ressourceAttendue('https://autre.example/mcp', ORIGINE)).toBe(false)
    expect(ressourceAttendue('dashboard.example/mcp', ORIGINE)).toBe(false)
    expect(ressourceAttendue(undefined, ORIGINE)).toBe(false)
  })
})

describe('les métadonnées', () => {
  it('désignent ce serveur comme son propre serveur d\'autorisation', () => {
    const r = metadonneesRessource(ORIGINE)
    expect(r.resource).toBe(`${ORIGINE}/mcp`)
    expect(r.authorization_servers).toEqual([ORIGINE])
    expect(r.scopes_supported).toEqual([...PORTEES])
  })

  it('annoncent PKCE S256, un client public, et ni CIMD ni enregistrement dynamique', () => {
    const a = metadonneesAutorisation(ORIGINE)
    expect(a.issuer).toBe(ORIGINE)
    expect(a.authorization_endpoint).toBe(`${ORIGINE}/oauth/autoriser`)
    expect(a.token_endpoint).toBe(`${ORIGINE}/oauth/jeton`)
    expect(a.code_challenge_methods_supported).toEqual(['S256'])
    expect(a.token_endpoint_auth_methods_supported).toEqual(['none'])
    expect(a.grant_types_supported).toEqual(['authorization_code', 'refresh_token'])
    expect(a).not.toHaveProperty('registration_endpoint')
    expect(a).not.toHaveProperty('client_id_metadata_document_supported')
  })

  it('bâtissent le défi Bearer que Claude attend sur un 401', () => {
    expect(defiBearer(ORIGINE, { portee: 'docs:read' }))
      .toBe(`Bearer resource_metadata="${ORIGINE}/.well-known/oauth-protected-resource/mcp", scope="docs:read"`)
    expect(defiBearer(ORIGINE, { erreur: 'invalid_token', description: 'jeton "expiré"' }))
      .toContain('error="invalid_token", error_description="jeton expiré"')
  })
})

describe('la demande d\'autorisation', () => {
  it('accepte une demande conforme, toutes portées si aucune n\'est demandée', () => {
    const lecture = lireDemandeAutorisation(demande(), { clientId: CLIENT, origine: ORIGINE })
    expect(lecture.ok).toBe(true)
    if (lecture.ok) {
      expect(lecture.demande).toEqual({
        clientId: CLIENT,
        redirectUri: URL_RAPPEL_CLAUDE,
        state: 'etat-1',
        codeChallenge: DEFI,
        resource: `${ORIGINE}/mcp`,
        portees: [...PORTEES],
      })
    }
  })

  it('refuse sur place, sans rediriger, un client inconnu ou une URL de rappel inconnue', () => {
    const client = lireDemandeAutorisation(demande({ client_id: 'autre' }), { clientId: CLIENT, origine: ORIGINE })
    expect(client).toMatchObject({ ok: false, erreur: 'invalid_client', redirigeable: false })
    const rappel = lireDemandeAutorisation(demande({ redirect_uri: 'https://claude.ai/autre' }), { clientId: CLIENT, origine: ORIGINE })
    expect(rappel).toMatchObject({ ok: false, erreur: 'invalid_request', redirigeable: false })
    const vide = lireDemandeAutorisation(demande(), { clientId: '', origine: ORIGINE })
    expect(vide).toMatchObject({ ok: false, erreur: 'invalid_client', redirigeable: false })
  })

  it('renvoie au client les autres erreurs', () => {
    const cas: Array<[Record<string, unknown>, string]> = [
      [{ response_type: 'token' }, 'unsupported_response_type'],
      [{ code_challenge_method: 'plain' }, 'invalid_request'],
      [{ code_challenge: undefined }, 'invalid_request'],
      [{ code_challenge: 'court' }, 'invalid_request'],
      [{ resource: 'https://autre.example/mcp' }, 'invalid_target'],
      [{ resource: undefined }, 'invalid_target'],
      [{ scope: 'docs:read admin' }, 'invalid_scope'],
    ]
    for (const [surcharge, erreur] of cas) {
      const lecture = lireDemandeAutorisation(demande(surcharge), { clientId: CLIENT, origine: ORIGINE })
      expect(lecture, JSON.stringify(surcharge)).toMatchObject({ ok: false, erreur, redirigeable: true })
    }
  })

  it('lit les portées demandées, sans doublon, et refuse l\'inconnue', () => {
    expect(lirePortees('')).toEqual([...PORTEES])
    expect(lirePortees('docs:read docs:read')).toEqual(['docs:read'])
    expect(lirePortees('docs:write')).toEqual(['docs:write'])
    expect(lirePortees('docs:read autre')).toBeNull()
  })

  it('compose l\'URL de retour en gardant l\'état et en omettant ce qui est nul', () => {
    const u = new URL(urlDeRetour(URL_RAPPEL_CLAUDE, { code: 'c1', state: 'e', vide: null }))
    expect(u.origin + u.pathname).toBe(URL_RAPPEL_CLAUDE)
    expect(u.searchParams.get('code')).toBe('c1')
    expect(u.searchParams.get('state')).toBe('e')
    expect(u.searchParams.has('vide')).toBe(false)
  })
})

describe('PKCE', () => {
  it('reconnaît le vérificateur du défi, et lui seul', () => {
    expect(verifierPkce(VERIFICATEUR, DEFI)).toBe(true)
    expect(verifierPkce('b'.repeat(50), DEFI)).toBe(false)
    expect(verifierPkce('court', DEFI)).toBe(false)
    expect(verifierPkce(undefined, DEFI)).toBe(false)
    expect(verifierPkce(`${VERIFICATEUR}!`, DEFI)).toBe(false)
  })
})

describe('les codes d\'autorisation', () => {
  const details = {
    clientId: CLIENT,
    redirectUri: URL_RAPPEL_CLAUDE,
    codeChallenge: DEFI,
    resource: `${ORIGINE}/mcp`,
    portees: [...PORTEES],
    sujet: '68059501',
  }

  it('ne se servent qu\'une fois', () => {
    const magasin = creerMagasinCodes(() => 0)
    const code = magasin.emettre(details)
    expect(magasin.consommer(code)).toMatchObject(details)
    expect(magasin.consommer(code)).toBeNull()
    expect(magasin.taille()).toBe(0)
  })

  it('périment au bout d\'une minute, et sont balayés', () => {
    let t = 0
    const magasin = creerMagasinCodes(() => t)
    const code = magasin.emettre(details)
    t = DUREE_CODE_MS
    expect(magasin.consommer(code)).toBeNull()
    magasin.emettre(details)
    expect(magasin.taille()).toBe(1)
  })

  it('ignorent ce qui n\'a jamais été émis', () => {
    const magasin = creerMagasinCodes()
    expect(magasin.consommer('inconnu')).toBeNull()
    expect(magasin.consommer(undefined)).toBeNull()
  })
})
