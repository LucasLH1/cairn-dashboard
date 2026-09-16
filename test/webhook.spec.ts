// La route des webhooks est la seule porte publique du dashboard : GitHub n'a
// pas de session. Tout repose donc sur ces vérifications, et ces tests éprouvent
// d'abord ce qui doit être refusé.
import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  evenementRetenu,
  EVENEMENTS,
  resumer,
  signatureValide,
  TAILLE_MAXIMALE,
} from '../server/utils/webhook'

const SECRET = 'un-secret-de-webhook-pour-l-epreuve'

function signer(corps: string, secret = SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(corps, 'utf8').digest('hex')}`
}

describe('la signature est vérifiée', () => {
  const corps = '{"ref":"refs/heads/dev"}'

  it('accepte une signature juste', () => {
    expect(signatureValide(corps, signer(corps), SECRET)).toBe(true)
  })

  it('refuse une signature calculée avec un autre secret', () => {
    expect(signatureValide(corps, signer(corps, 'un-autre-secret'), SECRET)).toBe(false)
  })

  it('refuse une signature qui ne correspond pas au corps', () => {
    expect(signatureValide('{"ref":"refs/heads/main"}', signer(corps), SECRET)).toBe(false)
  })

  it('refuse une signature absente ou vide', () => {
    expect(signatureValide(corps, null, SECRET)).toBe(false)
    expect(signatureValide(corps, '', SECRET)).toBe(false)
  })

  it('refuse une signature sans son préfixe d\'algorithme', () => {
    const sans = signer(corps).replace('sha256=', '')
    expect(signatureValide(corps, sans, SECRET)).toBe(false)
  })

  it('refuse l\'algorithme dépassé', () => {
    const sha1 = `sha1=${createHmac('sha1', SECRET).update(corps).digest('hex')}`
    expect(signatureValide(corps, sha1, SECRET)).toBe(false)
  })

  it('refuse tout quand aucun secret n\'est configuré', () => {
    expect(signatureValide(corps, signer(corps), '')).toBe(false)
  })

  it('refuse une signature tronquée sans lever d\'erreur', () => {
    // Les longueurs diffèrent : la comparaison à temps constant l'exigerait.
    expect(signatureValide(corps, 'sha256=abc', SECRET)).toBe(false)
  })

  it('refuse un seul octet modifié', () => {
    const juste = signer(corps)
    const faux = `${juste.slice(0, -1)}${juste.endsWith('a') ? 'b' : 'a'}`
    expect(signatureValide(corps, faux, SECRET)).toBe(false)
  })
})

describe('la liste des événements est fermée', () => {
  it('retient ceux que la tranche traite', () => {
    expect([...EVENEMENTS]).toEqual(['push', 'issues', 'pull_request', 'workflow_run'])
    for (const e of EVENEMENTS) expect(evenementRetenu(e)).toBe(true)
  })

  it('ignore le reste', () => {
    expect(evenementRetenu('star')).toBe(false)
    expect(evenementRetenu('ping')).toBe(false)
    expect(evenementRetenu('')).toBe(false)
    expect(evenementRetenu(undefined)).toBe(false)
  })
})

describe('la taille est bornée bien en deçà de ce que GitHub autorise', () => {
  it('borne à un mégaoctet', () => {
    expect(TAILLE_MAXIMALE).toBe(1_000_000)
    expect(TAILLE_MAXIMALE).toBeLessThan(25 * 1024 * 1024)
  })
})

describe('le résumé tire de chaque charge la ligne à afficher', () => {
  it('résume un push', () => {
    const r = resumer('push', {
      ref: 'refs/heads/dev',
      commits: [{ message: 'feat: ajoute le fil\n\nDétail' }, { message: 'fix' }],
      pusher: { name: 'LucasLH1' },
      repository: { full_name: 'LucasLH1/cairn-wms' },
      compare: 'https://github.com/x/y/compare/a...b',
    })
    expect(r.depot).toBe('LucasLH1/cairn-wms')
    expect(r.auteur).toBe('LucasLH1')
    expect(r.titre).toBe('2 commit(s) sur dev — feat: ajoute le fil')
    expect(r.url).toBe('https://github.com/x/y/compare/a...b')
  })

  it('résume une issue, avec son action', () => {
    const r = resumer('issues', {
      action: 'opened',
      issue: { number: 22, title: 'Ticket de test', html_url: 'https://github.com/x/y/issues/22' },
      sender: { login: 'LucasLH1' },
      repository: { full_name: 'LucasLH1/cairn-wms' },
    })
    expect(r.action).toBe('opened')
    expect(r.titre).toBe('#22 Ticket de test')
    expect(r.url).toBe('https://github.com/x/y/issues/22')
  })

  it('résume une pull request', () => {
    const r = resumer('pull_request', {
      action: 'closed',
      pull_request: { number: 18, title: 'Tranche 4', html_url: 'https://github.com/x/y/pull/18' },
      sender: { login: 'LucasLH1' },
    })
    expect(r.titre).toBe('#18 Tranche 4')
    expect(r.action).toBe('closed')
  })

  it('résume une exécution de workflow avec sa conclusion', () => {
    const r = resumer('workflow_run', {
      action: 'completed',
      workflow_run: { name: 'qualité', conclusion: 'success', html_url: 'https://github.com/x/y/actions/runs/1' },
      sender: { login: 'LucasLH1' },
    })
    expect(r.titre).toBe('qualité — success')
  })

  it('laisse nul ce qui manque, plutôt que d\'inventer', () => {
    const r = resumer('issues', {})
    expect(r).toEqual({ action: null, depot: null, auteur: null, titre: null, url: null })
  })

  it('ne casse pas sur une charge inattendue', () => {
    const r = resumer('push', { ref: 'refs/heads/main' })
    expect(r.titre).toBe('0 commit(s) sur main')
  })
})
