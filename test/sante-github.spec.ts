import { describe, expect, it } from 'vitest'
import { interpreterReponseGithub, verifierJetonGithub } from '../server/utils/sante-github'

describe('interpreterReponseGithub', () => {
  it('accepte une réponse 200', () => {
    expect(interpreterReponseGithub(200)).toBe('ok')
  })

  it('voit un jeton refusé sur 401 et 403', () => {
    expect(interpreterReponseGithub(401)).toBe('refuse')
    expect(interpreterReponseGithub(403)).toBe('refuse')
  })

  it('traite les autres codes et l\'échec réseau comme injoignable', () => {
    expect(interpreterReponseGithub(500)).toBe('injoignable')
    expect(interpreterReponseGithub(404)).toBe('injoignable')
    expect(interpreterReponseGithub(null)).toBe('injoignable')
  })
})

describe('verifierJetonGithub', () => {
  it('ne tente rien sans jeton ni dépôt', async () => {
    expect(await verifierJetonGithub('', 'exemple/depot')).toBe('non-configure')
    expect(await verifierJetonGithub('jeton-fictif', '')).toBe('non-configure')
  })
})
