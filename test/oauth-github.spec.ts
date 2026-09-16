import { describe, expect, it, vi } from 'vitest'
import {
  echangerCode,
  estAutorise,
  lireUtilisateur,
  urlAutorisation,
} from '../server/utils/oauth-github'

// Fournisseur simulé : aucun identifiant réel, aucun appel sortant.
function fournisseur(reponses: Record<string, { statut?: number, corps?: unknown }>) {
  return vi.fn(async (entree: RequestInfo | URL) => {
    const url = String(entree)
    const cle = Object.keys(reponses).find(motif => url.includes(motif))
    const reponse = cle ? reponses[cle]! : { statut: 404, corps: {} }
    return new Response(JSON.stringify(reponse.corps ?? {}), {
      status: reponse.statut ?? 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof globalThis.fetch
}

describe('estAutorise', () => {
  it('accepte le seul identifiant configuré', () => {
    expect(estAutorise(68059501, '68059501')).toBe(true)
    expect(estAutorise(68059501, ' 68059501 ')).toBe(true)
  })

  it('refuse tout autre identifiant, quel que soit le login', () => {
    expect(estAutorise(1, '68059501')).toBe(false)
    expect(estAutorise(680595010, '68059501')).toBe(false)
  })

  it('refuse quand rien n\'est configuré : la porte reste fermée', () => {
    expect(estAutorise(68059501, '')).toBe(false)
    expect(estAutorise(68059501, 'LucasLH1')).toBe(false)
  })

  it('refuse ce qui n\'est pas un identifiant numérique', () => {
    expect(estAutorise('68059501', '68059501')).toBe(false)
    expect(estAutorise(null, '68059501')).toBe(false)
    expect(estAutorise(1.5, '68059501')).toBe(false)
  })
})

describe('urlAutorisation', () => {
  it('emmène chez GitHub avec le rappel et l\'état', () => {
    const url = new URL(urlAutorisation('id-public', 'https://exemple.test/auth/github', 'etat-123'))
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize')
    expect(url.searchParams.get('client_id')).toBe('id-public')
    expect(url.searchParams.get('redirect_uri')).toBe('https://exemple.test/auth/github')
    expect(url.searchParams.get('state')).toBe('etat-123')
    expect(url.searchParams.get('scope')).toBe('')
  })
})

describe('echangerCode', () => {
  it('rend le jeton quand GitHub répond', async () => {
    const requeteur = fournisseur({ 'access_token': { corps: { access_token: 'jeton-simule' } } })
    const jeton = await echangerCode(requeteur, {
      clientId: 'id', clientSecret: 'secret', code: 'code', urlRappel: 'https://exemple.test/auth/github',
    })
    expect(jeton).toBe('jeton-simule')
  })

  it('rend null quand GitHub refuse ou ne renvoie pas de jeton', async () => {
    const refus = fournisseur({ 'access_token': { statut: 401 } })
    expect(await echangerCode(refus, { clientId: 'id', clientSecret: 's', code: 'c', urlRappel: 'u' })).toBeNull()

    const vide = fournisseur({ 'access_token': { corps: { error: 'bad_verification_code' } } })
    expect(await echangerCode(vide, { clientId: 'id', clientSecret: 's', code: 'c', urlRappel: 'u' })).toBeNull()
  })
})

describe('lireUtilisateur', () => {
  it('rend l\'identifiant et le login', async () => {
    const requeteur = fournisseur({ 'api.github.com/user': { corps: { id: 68059501, login: 'LucasLH1' } } })
    expect(await lireUtilisateur(requeteur, 'jeton')).toEqual({ id: 68059501, login: 'LucasLH1' })
  })

  it('rend null si GitHub refuse ou si la réponse est inattendue', async () => {
    expect(await lireUtilisateur(fournisseur({ 'api.github.com/user': { statut: 401 } }), 'j')).toBeNull()
    expect(await lireUtilisateur(fournisseur({ 'api.github.com/user': { corps: { login: 'LucasLH1' } } }), 'j')).toBeNull()
  })
})

describe('parcours complet, avec fournisseur simulé', () => {
  const idAutorise = '68059501'

  it('accepte le compte autorisé', async () => {
    const requeteur = fournisseur({
      'access_token': { corps: { access_token: 'jeton' } },
      'api.github.com/user': { corps: { id: 68059501, login: 'LucasLH1' } },
    })
    const jeton = await echangerCode(requeteur, { clientId: 'i', clientSecret: 's', code: 'c', urlRappel: 'u' })
    const utilisateur = await lireUtilisateur(requeteur, jeton!)
    expect(estAutorise(utilisateur!.id, idAutorise)).toBe(true)
  })

  it('refuse un autre compte, même s\'il porte le même login', async () => {
    const requeteur = fournisseur({
      'access_token': { corps: { access_token: 'jeton' } },
      'api.github.com/user': { corps: { id: 999999, login: 'LucasLH1' } },
    })
    const jeton = await echangerCode(requeteur, { clientId: 'i', clientSecret: 's', code: 'c', urlRappel: 'u' })
    const utilisateur = await lireUtilisateur(requeteur, jeton!)
    expect(utilisateur!.login).toBe('LucasLH1')
    expect(estAutorise(utilisateur!.id, idAutorise)).toBe(false)
  })
})
