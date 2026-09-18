// Les jetons du connecteur MCP — fiche 0011. Un garde-fou qui ne refuse
// jamais n'est pas prouvé : la plupart des cas doivent échouer.
import { describe, expect, it } from 'vitest'
import {
  DUREE_ACCES_S,
  emettreJetonAcces,
  empreinte,
  lireJetonAcces,
  nouveauJetonRafraichissement,
  nouvelleFamille,
  signerJetonAcces,
} from '../server/utils/mcp-jetons'

const SECRET = 'un-secret-de-signature-assez-long-pour-l-epreuve'
const AUTRE = 'un-autre-secret-de-signature-assez-long-aussi'

const revendications = {
  iss: 'https://dashboard.example',
  aud: 'https://dashboard.example/mcp',
  sub: '68059501',
  client_id: 'claude',
  scope: 'docs:read docs:write',
  iat: 1_000_000,
  exp: 1_000_000 + DUREE_ACCES_S,
  jti: 'abc',
}

describe('le jeton d\'accès', () => {
  it('se relit tel qu\'il a été signé', () => {
    const jeton = signerJetonAcces(revendications, SECRET)
    const lu = lireJetonAcces(jeton, SECRET, 1_000_500 * 1000)
    expect(lu).toEqual({ ok: true, revendications })
  })

  it('est refusé si sa signature ne vient pas de ce secret', () => {
    const jeton = signerJetonAcces(revendications, AUTRE)
    expect(lireJetonAcces(jeton, SECRET, 1_000_500 * 1000)).toEqual({ ok: false, raison: 'signature' })
  })

  it('est refusé si son contenu a été retouché après signature', () => {
    const jeton = signerJetonAcces(revendications, SECRET)
    const [entete, , signe] = jeton.split('.') as [string, string, string]
    const charge = Buffer.from(JSON.stringify({ ...revendications, sub: '1' })).toString('base64url')
    expect(lireJetonAcces(`${entete}.${charge}.${signe}`, SECRET, 1_000_500 * 1000)).toEqual({ ok: false, raison: 'signature' })
  })

  it('n\'accepte que l\'algorithme émis — jamais « none »', () => {
    const jeton = signerJetonAcces(revendications, SECRET)
    const [, charge] = jeton.split('.') as [string, string]
    const none = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    expect(lireJetonAcces(`${none}.${charge}.`, SECRET).ok).toBe(false)
    expect(lireJetonAcces(`${none}.${charge}.x`, SECRET)).toEqual({ ok: false, raison: 'algorithme' })
  })

  it('est refusé une fois expiré', () => {
    const jeton = signerJetonAcces(revendications, SECRET)
    expect(lireJetonAcces(jeton, SECRET, revendications.exp * 1000)).toEqual({ ok: false, raison: 'expire' })
  })

  it('refuse les formes qui n\'en sont pas', () => {
    for (const mauvais of ['', 'abc', 'a.b', 'a.b.c.d', '..']) {
      expect(lireJetonAcces(mauvais, SECRET).ok).toBe(false)
    }
  })

  it('refuse un contenu auquel il manque une revendication', () => {
    const { jti: _jti, ...sansJti } = revendications
    const jeton = signerJetonAcces(sansJti as typeof revendications, SECRET)
    expect(lireJetonAcces(jeton, SECRET, 1_000_500 * 1000)).toEqual({ ok: false, raison: 'contenu' })
  })

  it('s\'émet pour une heure, avec l\'audience et le sujet demandés', () => {
    const { jeton, expireDansS } = emettreJetonAcces({
      emetteur: 'https://dashboard.example',
      audience: 'https://dashboard.example/mcp',
      sujet: '68059501',
      client: 'claude',
      portees: ['docs:read'],
      secret: SECRET,
      maintenantMs: 2_000_000 * 1000,
    })
    expect(expireDansS).toBe(DUREE_ACCES_S)
    const lu = lireJetonAcces(jeton, SECRET, 2_000_000 * 1000)
    expect(lu.ok).toBe(true)
    if (lu.ok) {
      expect(lu.revendications.aud).toBe('https://dashboard.example/mcp')
      expect(lu.revendications.sub).toBe('68059501')
      expect(lu.revendications.scope).toBe('docs:read')
      expect(lu.revendications.exp - lu.revendications.iat).toBe(DUREE_ACCES_S)
    }
  })
})

describe('le jeton de rafraîchissement', () => {
  it('est aléatoire, et seule son empreinte est stable', () => {
    const a = nouveauJetonRafraichissement()
    const b = nouveauJetonRafraichissement()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(43)
    expect(empreinte(a)).toBe(empreinte(a))
    expect(empreinte(a)).not.toBe(empreinte(b))
    expect(empreinte(a)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('a une famille par consentement', () => {
    expect(nouvelleFamille()).not.toBe(nouvelleFamille())
  })
})
