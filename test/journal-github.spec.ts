// Le journal doit permettre de trancher une question, pas seulement de
// bavarder : pour chaque revalidation, il faut pouvoir dire si le compteur de
// quota a bougé. Ces tests éprouvent surtout cette conclusion.
import { beforeEach, describe, expect, it } from 'vitest'
import {
  coutDesRevalidations,
  derniers,
  lireQuota,
  noter,
  viderJournal,
} from '../server/utils/journal-github'

beforeEach(() => viderJournal())

describe('les compteurs de quota sont lus tels que GitHub les envoie', () => {
  it('lit les deux en-têtes', () => {
    expect(lireQuota({ 'x-ratelimit-used': '87', 'x-ratelimit-remaining': '4913' }))
      .toEqual({ utilise: 87, restant: 4913 })
  })

  it('accepte des nombres autant que des chaînes', () => {
    expect(lireQuota({ 'x-ratelimit-used': 12, 'x-ratelimit-remaining': 4988 }))
      .toEqual({ utilise: 12, restant: 4988 })
  })

  it('ne devine rien quand les en-têtes manquent', () => {
    expect(lireQuota({})).toEqual({ utilise: null, restant: null })
    expect(lireQuota(undefined)).toEqual({ utilise: null, restant: null })
  })
})

describe('chaque appel sortant est noté', () => {
  it('retient la ressource, le statut et le quota', () => {
    noter('arbre', 200, { 'x-ratelimit-used': '10', 'x-ratelimit-remaining': '4990' }, 1000)
    expect(derniers()).toEqual([
      { ressource: 'arbre', statut: 200, quotaUtilise: 10, quotaRestant: 4990, quandMs: 1000 },
    ])
  })

  it('garde l\'ordre des appels', () => {
    noter('a', 200, {}, 1)
    noter('b', 304, {}, 2)
    expect(derniers().map(x => x.ressource)).toEqual(['a', 'b'])
  })

  it('ne grandit pas sans fin', () => {
    for (let i = 0; i < 250; i += 1) noter(`r${i}`, 200, {}, i)
    const tous = derniers()
    expect(tous.length).toBe(200)
    // Ce sont les plus récents qu'on garde.
    expect(tous.at(-1)?.ressource).toBe('r249')
  })
})

describe('le journal tranche le coût d\'une revalidation', () => {
  it('conclut « gratuite » quand le compteur n\'a pas bougé', () => {
    noter('arbre', 200, { 'x-ratelimit-used': '50' })
    noter('arbre', 304, { 'x-ratelimit-used': '50' })
    expect(coutDesRevalidations()).toEqual({
      revalidations: 1, gratuites: 1, payantes: 0, indetermine: 0,
    })
  })

  it('conclut « payante » quand le compteur a monté', () => {
    noter('arbre', 200, { 'x-ratelimit-used': '50' })
    noter('arbre', 304, { 'x-ratelimit-used': '51' })
    expect(coutDesRevalidations()).toEqual({
      revalidations: 1, gratuites: 0, payantes: 1, indetermine: 0,
    })
  })

  it('refuse de conclure sans compteur', () => {
    noter('arbre', 200, {})
    noter('arbre', 304, {})
    expect(coutDesRevalidations()).toMatchObject({ revalidations: 1, indetermine: 1 })
  })

  it('ne conclut rien d\'une revalidation sans appel précédent', () => {
    noter('arbre', 304, { 'x-ratelimit-used': '50' })
    expect(coutDesRevalidations()).toMatchObject({ revalidations: 1, indetermine: 1 })
  })

  it('ignore les appels qui ne sont pas des revalidations', () => {
    noter('a', 200, { 'x-ratelimit-used': '1' })
    noter('b', 404, { 'x-ratelimit-used': '2' })
    expect(coutDesRevalidations().revalidations).toBe(0)
  })
})
