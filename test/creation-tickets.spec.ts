// La création est éprouvée **avec un GitHub simulé** : aucune issue de test
// n'est écrite dans cairn-wms, et aucun dépôt d'essai n'est à nettoyer.
//
// Ce qui compte ici n'est pas que la création « marche », mais que ce qui part
// chez GitHub soit exactement ce qui a été validé, que la liste cesse aussitôt
// d'être périmée, et que chaque échec soit traduit sans mentir sur ce qui a été
// écrit.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { creerClientTickets, viderCachesTickets } from '../server/utils/tickets-github'
import { ECHECS_CREATION, interpreterEchecCreation } from '../server/utils/tickets'
import type { OctokitTickets } from '../server/utils/tickets-github'
import { viderJournal } from '../server/utils/journal-github'

function reponse<T>(data: T, status = 200) {
  return { status, headers: { 'x-ratelimit-used': '1', 'x-ratelimit-remaining': '4999' }, data }
}

function githubSimule(surcharges: Partial<OctokitTickets['rest']['issues']> = {}) {
  const issues = {
    listLabelsForRepo: vi.fn(async () => reponse([{ name: 'tech' }, { name: 'bug' }])),
    listForRepo: vi.fn(async () => reponse([
      { number: 1, title: 'Un ticket', state: 'open', labels: [{ name: 'tech' }], html_url: 'https://github.com/x/y/issues/1', created_at: '2026-09-15T20:07:13Z', comments: 0 },
      { number: 2, title: 'Une pull request', state: 'open', labels: [], pull_request: { url: '…' }, html_url: '…', created_at: '…', comments: 0 },
    ])),
    create: vi.fn(async () => reponse({ number: 42, html_url: 'https://github.com/x/y/issues/42' }, 201)),
    ...surcharges,
  }
  return { faux: { rest: { issues } } as unknown as OctokitTickets, issues }
}

beforeEach(() => {
  viderCachesTickets()
  viderJournal()
})

describe('la lecture des tickets', () => {
  it('écarte les pull requests que l\'API mêle aux issues', async () => {
    const { faux } = githubSimule()
    const tickets = await creerClientTickets('jeton', 'x/y', faux).tickets()
    expect(tickets.map(t => t.numero)).toEqual([1])
  })

  it('ne redemande pas GitHub dans la fenêtre de fraîcheur', async () => {
    const { faux, issues } = githubSimule()
    const client = creerClientTickets('jeton', 'x/y', faux)
    await client.tickets()
    await client.tickets()
    expect(issues.listForRepo).toHaveBeenCalledTimes(1)
  })
})

describe('ce qui part chez GitHub est ce qui a été validé', () => {
  it('envoie le titre, le corps et les labels', async () => {
    const { faux, issues } = githubSimule()
    const client = creerClientTickets('jeton', 'x/y', faux)
    await client.creer({ titre: 'Un titre', corps: 'Un corps', labels: ['tech'] })

    expect(issues.create).toHaveBeenCalledTimes(1)
    expect(issues.create.mock.calls[0]?.[0]).toMatchObject({
      owner: 'x',
      repo: 'y',
      title: 'Un titre',
      body: 'Un corps',
      labels: ['tech'],
    })
  })

  it('n\'envoie pas de corps vide ni de liste de labels vide', async () => {
    const { faux, issues } = githubSimule()
    await creerClientTickets('jeton', 'x/y', faux).creer({ titre: 'Titre seul', corps: '', labels: [] })
    const envoye = issues.create.mock.calls[0]?.[0] as Record<string, unknown>
    expect(envoye).not.toHaveProperty('body')
    expect(envoye).not.toHaveProperty('labels')
  })

  it('rend le numéro et l\'adresse du ticket créé', async () => {
    const { faux } = githubSimule()
    const cree = await creerClientTickets('jeton', 'x/y', faux).creer({ titre: 'T', corps: '', labels: [] })
    expect(cree).toEqual({ numero: 42, url: 'https://github.com/x/y/issues/42' })
  })

  it('n\'appelle aucune route de modification, de fermeture ou de commentaire', async () => {
    const { faux, issues } = githubSimule()
    await creerClientTickets('jeton', 'x/y', faux).creer({ titre: 'T', corps: '', labels: [] })
    // Le client n'expose que trois gestes : lire les labels, lire, créer.
    expect(Object.keys(issues).sort()).toEqual(['create', 'listForRepo', 'listLabelsForRepo'])
  })
})

describe('une création rend la liste périmée sur-le-champ', () => {
  it('fait relire GitHub après une création', async () => {
    const { faux, issues } = githubSimule()
    const client = creerClientTickets('jeton', 'x/y', faux)

    await client.tickets()
    expect(issues.listForRepo).toHaveBeenCalledTimes(1)

    await client.creer({ titre: 'Nouveau', corps: '', labels: [] })
    await client.tickets()

    // Sans invalidation, le ticket créé resterait invisible jusqu'à trente
    // secondes, et l'auteur croirait à un échec.
    expect(issues.listForRepo).toHaveBeenCalledTimes(2)
  })

  it('ne touche pas au cache des labels, qui n\'a pas changé', async () => {
    const { faux, issues } = githubSimule()
    const client = creerClientTickets('jeton', 'x/y', faux)
    await client.labels()
    await client.creer({ titre: 'Nouveau', corps: '', labels: [] })
    await client.labels()
    expect(issues.listLabelsForRepo).toHaveBeenCalledTimes(1)
  })
})

describe('les échecs d\'écriture sont traduits sans mentir', () => {
  it('reconnaît un contenu refusé par GitHub', () => {
    expect(interpreterEchecCreation({ status: 422 })).toBe('invalide')
  })

  it('traite un « introuvable » comme un droit manquant', () => {
    // Sur une écriture, GitHub masque en 404 ce qui est un défaut de droit :
    // annoncer « dépôt introuvable » enverrait chercher au mauvais endroit.
    expect(interpreterEchecCreation({ status: 404 })).toBe('refuse')
  })

  it('distingue le quota du refus, tous deux en 403', () => {
    expect(interpreterEchecCreation({ status: 403, response: { headers: { 'x-ratelimit-remaining': '0' } } })).toBe('quota')
    expect(interpreterEchecCreation({ status: 403, response: { headers: { 'x-ratelimit-remaining': '12' } } })).toBe('refuse')
  })

  it('traite une panne réseau comme injoignable', () => {
    expect(interpreterEchecCreation(new Error('fetch failed'))).toBe('injoignable')
  })

  it('dit pour chaque échec ce qu\'il en est de l\'écriture', () => {
    for (const echec of Object.values(ECHECS_CREATION)) {
      expect(echec.detail).toMatch(/écrit/)
      expect(echec.detail).not.toMatch(/\b(422|403|404|HTTP|API)\b/)
    }
  })

  it('remonte l\'échec plutôt que de le taire', async () => {
    const { faux } = githubSimule({
      create: vi.fn(async () => { throw { status: 422 } }),
    })
    await expect(creerClientTickets('jeton', 'x/y', faux).creer({ titre: 'T', corps: '', labels: [] }))
      .rejects.toMatchObject({ status: 422 })
  })
})
