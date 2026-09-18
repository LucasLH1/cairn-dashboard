// L'écriture dans docs/ de cairn-wms — la troisième écriture du cadrage,
// bornée par le serveur. Éprouvée sans écrire une seule ligne dans cairn-wms :
// Octokit est simulé.
import { describe, expect, it } from 'vitest'
import {
  ecrireDocument,
  ErreurEcriture,
  lireDocumentBrut,
  messageDeCommit,
  RESUME_MAXIMUM,
  TAILLE_MAXIMALE,
  verifierEcriture,
} from '../server/utils/ecriture-doc'
import type { OctokitEcriture } from '../server/utils/ecriture-doc'

const bonne = { chemin: 'socle/0.1-organisation.md', contenu: '# Titre\n', resume: 'précise le module 0.1', sha: 'a'.repeat(40) }

describe('la vérification d\'une écriture', () => {
  it('accepte une demande conforme, avec ou sans sha', () => {
    expect(verifierEcriture(bonne)).toEqual({ ok: true, ecriture: bonne })
    expect(verifierEcriture({ ...bonne, sha: '' })).toEqual({ ok: true, ecriture: { ...bonne, sha: null } })
    expect(verifierEcriture({ ...bonne, chemin: '/socle/0.1-organisation.md' })).toMatchObject({ ok: true })
  })

  it('refuse tout chemin qui sort de docs/, ou qui n\'est pas un document', () => {
    for (const chemin of ['../status.yml', 'docs/socle/x.md', 'socle/../../x.md', 'socle/x.txt', '', 'socle\\x.md']) {
      expect(verifierEcriture({ ...bonne, chemin }), chemin).toEqual({ ok: false, refus: 'chemin' })
    }
  })

  it('refuse un résumé absent, trop long, ou qui pose lui-même le préfixe', () => {
    expect(verifierEcriture({ ...bonne, resume: '' })).toEqual({ ok: false, refus: 'resume' })
    expect(verifierEcriture({ ...bonne, resume: 'x'.repeat(RESUME_MAXIMUM + 1) })).toEqual({ ok: false, refus: 'resume' })
    expect(verifierEcriture({ ...bonne, resume: 'docs: déjà préfixé' })).toEqual({ ok: false, refus: 'resume' })
    expect(verifierEcriture({ ...bonne, resume: 'sur\ndeux lignes' })).toMatchObject({ ok: true, ecriture: { resume: 'sur deux lignes' } })
  })

  it('refuse un contenu vide ou trop gros, et un sha qui n\'en est pas un', () => {
    expect(verifierEcriture({ ...bonne, contenu: '  \n' })).toEqual({ ok: false, refus: 'contenu-vide' })
    expect(verifierEcriture({ ...bonne, contenu: 'x'.repeat(TAILLE_MAXIMALE + 1) })).toEqual({ ok: false, refus: 'trop-gros' })
    expect(verifierEcriture({ ...bonne, sha: 'pas-un-sha' })).toEqual({ ok: false, refus: 'chemin' })
  })

  it('compose le message du commit avec le préfixe du cadrage', () => {
    expect(messageDeCommit('précise le module 0.1')).toBe('docs: précise le module 0.1')
  })
})

function faux(reponses: { put?: () => Promise<unknown>, get?: () => Promise<unknown> }, appels: Record<string, unknown>[] = []): OctokitEcriture {
  return {
    rest: {
      repos: {
        getContent: async (args) => {
          appels.push(args)
          return (reponses.get ? await reponses.get() : { status: 200, headers: {}, data: {} }) as never
        },
        createOrUpdateFileContents: async (args) => {
          appels.push(args)
          return (reponses.put ? await reponses.put() : { status: 200, headers: {}, data: {} }) as never
        },
      },
    },
  }
}

describe('l\'écriture par l\'API de contenu', () => {
  it('écrit dans docs/, sur dev, avec un message docs: et le sha lu', async () => {
    const appels: Record<string, unknown>[] = []
    const octokit = faux({
      put: async () => ({ status: 200, headers: {}, data: { content: { sha: 'b'.repeat(40), html_url: 'https://github.com/x/y/blob/dev/docs/socle/0.1-organisation.md' }, commit: { sha: 'c'.repeat(40) } } }),
    }, appels)

    const resultat = await ecrireDocument('jeton', 'x/y', bonne, octokit)

    expect(appels[0]).toMatchObject({
      owner: 'x',
      repo: 'y',
      path: 'docs/socle/0.1-organisation.md',
      branch: 'dev',
      message: 'docs: précise le module 0.1',
      sha: 'a'.repeat(40),
    })
    expect(Buffer.from(String(appels[0]?.content), 'base64').toString('utf8')).toBe('# Titre\n')
    expect(resultat).toEqual({ chemin: bonne.chemin, sha: 'b'.repeat(40), commit: 'c'.repeat(40), url: 'https://github.com/x/y/blob/dev/docs/socle/0.1-organisation.md' })
  })

  it('n\'envoie pas de sha pour une création', async () => {
    const appels: Record<string, unknown>[] = []
    await ecrireDocument('jeton', 'x/y', { ...bonne, sha: null }, faux({ put: async () => ({ status: 201, headers: {}, data: { content: { sha: 'd'.repeat(40) }, commit: { sha: 'e'.repeat(40) } } }) }, appels))
    expect(appels[0]).not.toHaveProperty('sha')
  })

  it('traduit les refus de GitHub : conflit, existe déjà, refusé, absent', async () => {
    const cas: Array<[number, string]> = [[409, 'conflit'], [422, 'existe-deja'], [403, 'refuse'], [401, 'refuse'], [404, 'absent'], [500, 'injoignable']]
    for (const [status, attendu] of cas) {
      const octokit = faux({ put: async () => { throw Object.assign(new Error(`HTTP ${status}`), { status }) } })
      const erreur = await ecrireDocument('jeton', 'x/y', bonne, octokit).catch((e: unknown) => e)
      expect(erreur, String(status)).toBeInstanceOf(ErreurEcriture)
      expect((erreur as ErreurEcriture).echec).toBe(attendu)
    }
  })
})

describe('la lecture brute, avec son sha', () => {
  it('décode le contenu et rend le sha, sur dev', async () => {
    const appels: Record<string, unknown>[] = []
    const octokit = faux({
      get: async () => ({ status: 200, headers: {}, data: { type: 'file', content: Buffer.from('# Lu\n').toString('base64'), sha: 'f'.repeat(40) } }),
    }, appels)
    expect(await lireDocumentBrut('jeton', 'x/y', 'socle/0.1-organisation.md', octokit)).toEqual({ contenu: '# Lu\n', sha: 'f'.repeat(40) })
    expect(appels[0]).toMatchObject({ path: 'docs/socle/0.1-organisation.md', ref: 'dev' })
  })

  it('refuse un chemin hors de docs/ avant tout appel, et un dossier', async () => {
    const appels: Record<string, unknown>[] = []
    const octokit = faux({ get: async () => ({ status: 200, headers: {}, data: [] }) }, appels)
    await expect(lireDocumentBrut('jeton', 'x/y', '../status.yml', octokit)).rejects.toMatchObject({ echec: 'absent' })
    expect(appels).toHaveLength(0)
    await expect(lireDocumentBrut('jeton', 'x/y', 'socle/x.md', octokit)).rejects.toMatchObject({ echec: 'absent' })
  })
})
