// Le cache n'a d'intérêt que s'il évite réellement des appels, et s'il ne sert
// jamais une valeur périmée en silence. Ces tests comptent les appels plutôt que
// de faire confiance à la mécanique.
import { describe, expect, it, vi } from 'vitest'
import {
  creerCache,
  estFrais,
  estNonModifie,
  FRAICHEUR_MS,
  servir,
} from '../server/utils/cache-github'

/** Horloge qu'on avance à la main : le temps ne doit pas décider du résultat. */
function horloge(depart = 1_000_000) {
  let t = depart
  return { lire: () => t, avancer: (ms: number) => { t += ms } }
}

describe('la fenêtre de fraîcheur', () => {
  it('est courte, et justifiée : trente secondes', () => {
    expect(FRAICHEUR_MS).toBe(30_000)
  })

  it('tient tant que la durée n\'est pas écoulée', () => {
    const entree = { valeur: 1, etag: 'a', confirmee: 1000 }
    expect(estFrais(entree, 1000 + 29_999)).toBe(true)
    expect(estFrais(entree, 1000 + 30_000)).toBe(false)
  })

  it('considère l\'absence d\'entrée comme non fraîche', () => {
    expect(estFrais(undefined, 0)).toBe(false)
  })
})

describe('servir une lecture demande à GitHub le moins possible', () => {
  it('lit une première fois, puis ne redemande rien dans la fenêtre', async () => {
    const h = horloge()
    const cache = creerCache<string>()
    const revalider = vi.fn(async () => ({ modifie: true as const, valeur: 'v1', etag: 'e1' }))

    const un = await servir(cache, 'k', revalider, h.lire)
    expect(un).toEqual({ valeur: 'v1', origine: 'lu' })
    expect(revalider).toHaveBeenCalledTimes(1)

    h.avancer(10_000)
    const deux = await servir(cache, 'k', revalider, h.lire)
    expect(deux).toEqual({ valeur: 'v1', origine: 'cache' })
    // Le point de tout l'exercice : aucun second appel.
    expect(revalider).toHaveBeenCalledTimes(1)
  })

  it('revalide au-delà de la fenêtre, et reconduit la valeur si rien n\'a changé', async () => {
    const h = horloge()
    const cache = creerCache<string>()
    const revalider = vi.fn()
      .mockResolvedValueOnce({ modifie: true, valeur: 'v1', etag: 'e1' })
      .mockResolvedValueOnce({ modifie: false })

    await servir(cache, 'k', revalider, h.lire)
    h.avancer(FRAICHEUR_MS + 1)
    const apres = await servir(cache, 'k', revalider, h.lire)

    expect(apres).toEqual({ valeur: 'v1', origine: 'revalide' })
    expect(revalider).toHaveBeenCalledTimes(2)
    // L'ETag connu est bien renvoyé : c'est lui qui rend le 304 possible.
    expect(revalider).toHaveBeenLastCalledWith('e1')
  })

  it('repousse l\'échéance après une revalidation sans changement', async () => {
    const h = horloge()
    const cache = creerCache<string>()
    const revalider = vi.fn()
      .mockResolvedValueOnce({ modifie: true, valeur: 'v1', etag: 'e1' })
      .mockResolvedValueOnce({ modifie: false })

    await servir(cache, 'k', revalider, h.lire)
    h.avancer(FRAICHEUR_MS + 1)
    await servir(cache, 'k', revalider, h.lire)

    h.avancer(10_000)
    const encore = await servir(cache, 'k', revalider, h.lire)
    expect(encore.origine).toBe('cache')
    expect(revalider).toHaveBeenCalledTimes(2)
  })

  it('remplace la valeur quand la source a changé', async () => {
    const h = horloge()
    const cache = creerCache<string>()
    const revalider = vi.fn()
      .mockResolvedValueOnce({ modifie: true, valeur: 'v1', etag: 'e1' })
      .mockResolvedValueOnce({ modifie: true, valeur: 'v2', etag: 'e2' })

    await servir(cache, 'k', revalider, h.lire)
    h.avancer(FRAICHEUR_MS + 1)
    const apres = await servir(cache, 'k', revalider, h.lire)

    expect(apres).toEqual({ valeur: 'v2', origine: 'lu' })
    expect(cache.entree('k')?.etag).toBe('e2')
  })

  it('sépare les clés : un document ne sert pas pour un autre', async () => {
    const h = horloge()
    const cache = creerCache<string>()
    const revalider = vi.fn()
      .mockResolvedValueOnce({ modifie: true, valeur: 'arbre', etag: 'e1' })
      .mockResolvedValueOnce({ modifie: true, valeur: 'doc', etag: 'e2' })

    expect((await servir(cache, 'arbre', revalider, h.lire)).valeur).toBe('arbre')
    expect((await servir(cache, 'doc', revalider, h.lire)).valeur).toBe('doc')
    expect(cache.taille()).toBe(2)
  })

  it('refuse un « rien n\'a changé » quand rien n\'est en cache', async () => {
    const cache = creerCache<string>()
    const revalider = async () => ({ modifie: false as const })
    await expect(servir(cache, 'k', revalider)).rejects.toThrow()
  })

  it('oublie une entrée sur demande, et redemande alors à GitHub', async () => {
    const h = horloge()
    const cache = creerCache<string>()
    const revalider = vi.fn(async () => ({ modifie: true as const, valeur: 'v', etag: 'e' }))

    await servir(cache, 'k', revalider, h.lire)
    cache.oublier('k')
    await servir(cache, 'k', revalider, h.lire)
    expect(revalider).toHaveBeenCalledTimes(2)
  })
})

describe('le 304 de GitHub est reconnu', () => {
  it('reconnaît le code que rend Octokit', () => {
    expect(estNonModifie({ status: 304 })).toBe(true)
  })

  it('ne confond pas avec un autre échec', () => {
    expect(estNonModifie({ status: 404 })).toBe(false)
    expect(estNonModifie(new Error('réseau'))).toBe(false)
    expect(estNonModifie(undefined)).toBe(false)
  })
})
