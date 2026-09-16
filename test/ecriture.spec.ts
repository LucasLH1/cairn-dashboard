// Première écriture du dashboard : ces garde-fous doivent refuser, et c'est ce
// qu'on éprouve ici. Une écriture dupliquée dans cairn-wms ne serait pas
// rattrapable — le dashboard n'a le droit ni de modifier ni de fermer.
import { describe, expect, it, vi } from 'vitest'
import {
  creerAntiDoublon,
  jetonAcceptable,
  MEMOIRE_MS,
  origineAcceptable,
} from '../server/utils/ecriture'

describe('l\'origine d\'une écriture est vérifiée', () => {
  it('accepte une requête venue du dashboard lui-même', () => {
    expect(origineAcceptable('https://monitoring.cairn-wms.fr', 'monitoring.cairn-wms.fr')).toBe(true)
    expect(origineAcceptable('http://127.0.0.1:3021', '127.0.0.1:3021')).toBe(true)
  })

  it('refuse une origine étrangère', () => {
    expect(origineAcceptable('https://ailleurs.example', 'monitoring.cairn-wms.fr')).toBe(false)
  })

  it('refuse un hôte voisin qui contient le bon', () => {
    expect(origineAcceptable('https://monitoring.cairn-wms.fr.ailleurs.example', 'monitoring.cairn-wms.fr')).toBe(false)
  })

  it('refuse une origine absente : un navigateur en envoie toujours une', () => {
    expect(origineAcceptable(null, 'monitoring.cairn-wms.fr')).toBe(false)
    expect(origineAcceptable('', 'monitoring.cairn-wms.fr')).toBe(false)
    expect(origineAcceptable(undefined, 'monitoring.cairn-wms.fr')).toBe(false)
  })

  it('refuse quand l\'hôte est inconnu', () => {
    expect(origineAcceptable('https://monitoring.cairn-wms.fr', '')).toBe(false)
  })

  it('refuse une origine qui n\'est pas une adresse', () => {
    expect(origineAcceptable('pas une URL', 'monitoring.cairn-wms.fr')).toBe(false)
    expect(origineAcceptable('null', 'monitoring.cairn-wms.fr')).toBe(false)
  })

  it('distingue le port', () => {
    expect(origineAcceptable('http://127.0.0.1:3000', '127.0.0.1:3021')).toBe(false)
  })
})

describe('le jeton d\'intention a une forme attendue', () => {
  it('accepte un identifiant aléatoire', () => {
    expect(jetonAcceptable('3f2b1a9c8d7e6f50')).toBe(true)
    expect(jetonAcceptable('0f9e8d7c-6b5a-4938-2716-05f4e3d2c1b0')).toBe(true)
  })

  it('refuse ce qui n\'en est pas un', () => {
    expect(jetonAcceptable('')).toBe(false)
    expect(jetonAcceptable('court')).toBe(false)
    expect(jetonAcceptable('../../etc/passwd')).toBe(false)
    expect(jetonAcceptable(undefined)).toBe(false)
  })
})

describe('une même intention n\'écrit qu\'une fois', () => {
  function horloge(depart = 1_000_000) {
    let t = depart
    return { lire: () => t, avancer: (ms: number) => { t += ms } }
  }

  it('ne connaît rien au départ', () => {
    const anti = creerAntiDoublon<number>()
    expect(anti.deja('abc123abc123abc1')).toBeUndefined()
  })

  it('rend le résultat de la première écriture à la seconde tentative', () => {
    const anti = creerAntiDoublon<{ numero: number }>()
    anti.retenir('abc123abc123abc1', { numero: 42 })
    expect(anti.deja('abc123abc123abc1')).toEqual({ numero: 42 })
  })

  it('sépare deux intentions différentes', () => {
    const anti = creerAntiDoublon<number>()
    anti.retenir('aaaa1111aaaa1111', 1)
    expect(anti.deja('bbbb2222bbbb2222')).toBeUndefined()
  })

  it('oublie une intention passée', () => {
    const h = horloge()
    const anti = creerAntiDoublon<number>(MEMOIRE_MS, h.lire)
    anti.retenir('aaaa1111aaaa1111', 1)

    h.avancer(MEMOIRE_MS - 1)
    expect(anti.deja('aaaa1111aaaa1111')).toBe(1)

    h.avancer(2)
    expect(anti.deja('aaaa1111aaaa1111')).toBeUndefined()
    expect(anti.taille()).toBe(0)
  })

  it('ne garde pas indéfiniment ce qu\'on lui confie', () => {
    const h = horloge()
    const anti = creerAntiDoublon<number>(MEMOIRE_MS, h.lire)
    for (let i = 0; i < 50; i += 1) {
      anti.retenir(`jeton${String(i).padStart(11, '0')}`, i)
      h.avancer(30_000)
    }
    // Vingt intentions au plus tiennent dans dix minutes, à raison d'une toutes
    // les trente secondes.
    expect(anti.taille()).toBeLessThanOrEqual(21)
  })

  it('écrase une intention réutilisée, sans dupliquer', () => {
    const anti = creerAntiDoublon<number>()
    const espion = vi.fn()
    anti.retenir('cccc3333cccc3333', 1)
    if (anti.deja('cccc3333cccc3333') === undefined) espion()
    expect(espion).not.toHaveBeenCalled()
    expect(anti.taille()).toBe(1)
  })
})
