// Un jeton valide mais sans droit de lecture doit rendre la sonde malsaine :
// c'est le trou que la tranche 2 a mis au jour, où /health répondait 200 pendant
// que chaque écran affichait un refus.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RETENUE_MS, TEMOIN, verifierLecture, viderSante } from '../server/utils/sante-lecture'

function horloge(depart = 500_000) {
  let t = depart
  return { lire: () => t, avancer: (ms: number) => { t += ms } }
}

beforeEach(() => viderSante())

describe('la sonde éprouve une lecture réelle', () => {
  it('lit le suivi de cairn-wms, que la tranche 3 affiche de toute façon', () => {
    expect(TEMOIN).toBe('status.yml')
  })

  it('rend « ok » quand le contenu arrive', async () => {
    const h = horloge()
    expect(await verifierLecture(async () => 'projet: Cairn WMS', true, h.lire)).toBe('ok')
  })

  it('rend « refuse » quand le jeton n\'a pas le droit de lire', async () => {
    const h = horloge()
    const refus = async () => { throw { status: 403, response: { headers: { 'x-ratelimit-remaining': '4999' } } } }
    expect(await verifierLecture(refus, true, h.lire)).toBe('refuse')
  })

  it('rend « refuse » sur un jeton invalide', async () => {
    const h = horloge()
    const refus = async () => { throw { status: 401 } }
    expect(await verifierLecture(refus, true, h.lire)).toBe('refuse')
  })

  it('distingue le quota épuisé', async () => {
    const h = horloge()
    const quota = async () => { throw { status: 403, response: { headers: { 'x-ratelimit-remaining': '0' } } } }
    expect(await verifierLecture(quota, true, h.lire)).toBe('quota')
  })

  it('rend « absent » si le fichier témoin a disparu', async () => {
    const h = horloge()
    const absent = async () => { throw { status: 404 } }
    expect(await verifierLecture(absent, true, h.lire)).toBe('absent')
  })

  it('rend « absent » sur un contenu vide : le droit ne suffit pas', async () => {
    const h = horloge()
    expect(await verifierLecture(async () => '', true, h.lire)).toBe('absent')
  })

  it('rend « injoignable » quand GitHub ne répond pas', async () => {
    const h = horloge()
    const panne = async () => { throw new Error('fetch failed') }
    expect(await verifierLecture(panne, true, h.lire)).toBe('injoignable')
  })

  it('ne lit rien tant que la configuration est incomplète', async () => {
    const lire = vi.fn(async () => 'contenu')
    expect(await verifierLecture(lire, false)).toBe('non-configure')
    expect(lire).not.toHaveBeenCalled()
  })
})

describe('le verdict est retenu, pour ne pas manger le quota', () => {
  it('ne relit pas pendant la minute qui suit', async () => {
    const h = horloge()
    const lire = vi.fn(async () => 'projet: Cairn WMS')

    await verifierLecture(lire, true, h.lire)
    h.avancer(30_000)
    await verifierLecture(lire, true, h.lire)

    expect(lire).toHaveBeenCalledTimes(1)
  })

  it('relit une fois la retenue écoulée', async () => {
    const h = horloge()
    const lire = vi.fn(async () => 'projet: Cairn WMS')

    await verifierLecture(lire, true, h.lire)
    h.avancer(RETENUE_MS + 1)
    await verifierLecture(lire, true, h.lire)

    expect(lire).toHaveBeenCalledTimes(2)
  })

  it('retient aussi un refus : la sonde ne s\'acharne pas', async () => {
    const h = horloge()
    const refus = vi.fn(async () => { throw { status: 401 } })

    expect(await verifierLecture(refus, true, h.lire)).toBe('refuse')
    h.avancer(10_000)
    expect(await verifierLecture(refus, true, h.lire)).toBe('refuse')
    expect(refus).toHaveBeenCalledTimes(1)
  })

  it('voit le droit revenir après la retenue', async () => {
    const h = horloge()
    const lire = vi.fn()
      .mockRejectedValueOnce({ status: 403, response: { headers: { 'x-ratelimit-remaining': '9' } } })
      .mockResolvedValueOnce('projet: Cairn WMS')

    expect(await verifierLecture(lire, true, h.lire)).toBe('refuse')
    h.avancer(RETENUE_MS + 1)
    expect(await verifierLecture(lire, true, h.lire)).toBe('ok')
  })
})
