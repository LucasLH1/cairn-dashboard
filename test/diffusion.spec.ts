// Le fil en direct n'a d'intérêt que s'il atteint tout le monde. Ces tests
// éprouvent surtout le cas dégradé : une connexion morte ne doit pas priver les
// autres de ce qui arrive.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { combien, diffuser, inscrire, retirer, viderConnexions } from '../server/utils/diffusion'

function connexion() {
  return { send: vi.fn() }
}

beforeEach(() => viderConnexions())

describe('le registre des connexions', () => {
  it('part vide', () => {
    expect(combien()).toBe(0)
  })

  it('inscrit et retire', () => {
    const c = connexion()
    inscrire(c)
    expect(combien()).toBe(1)
    retirer(c)
    expect(combien()).toBe(0)
  })

  it('n'
    + 'inscrit pas deux fois la même connexion', () => {
    const c = connexion()
    inscrire(c)
    inscrire(c)
    expect(combien()).toBe(1)
  })
})

describe('la diffusion', () => {
  it('envoie à toutes les connexions', () => {
    const a = connexion()
    const b = connexion()
    inscrire(a)
    inscrire(b)

    expect(diffuser({ sorte: 'evenement' })).toBe(2)
    expect(a.send).toHaveBeenCalledWith('{"sorte":"evenement"}')
    expect(b.send).toHaveBeenCalledWith('{"sorte":"evenement"}')
  })

  it('n\'envoie rien quand personne n\'écoute', () => {
    expect(diffuser({ sorte: 'evenement' })).toBe(0)
  })

  it('sérialise le message une fois, en JSON', () => {
    const a = connexion()
    inscrire(a)
    diffuser({ sorte: 'evenement', evenement: { type: 'push' } })
    expect(a.send).toHaveBeenCalledWith('{"sorte":"evenement","evenement":{"type":"push"}}')
  })

  it('continue malgré une connexion morte, et la retire', () => {
    const morte = { send: vi.fn(() => { throw new Error('connexion fermée') }) }
    const vivante = connexion()
    inscrire(morte)
    inscrire(vivante)

    // La vivante doit recevoir, quoi qu'il arrive à l'autre.
    expect(diffuser({ sorte: 'evenement' })).toBe(1)
    expect(vivante.send).toHaveBeenCalled()
    expect(combien()).toBe(1)
  })

  it('ne garde pas une connexion morte pour la diffusion suivante', () => {
    const morte = { send: vi.fn(() => { throw new Error('fermée') }) }
    inscrire(morte)
    diffuser({ sorte: 'un' })
    diffuser({ sorte: 'deux' })
    expect(morte.send).toHaveBeenCalledTimes(1)
  })
})
