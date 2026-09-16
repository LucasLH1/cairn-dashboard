// La tranche 4 est la première écriture du dashboard dans cairn-wms. Ces tests
// éprouvent d'abord ce qui doit être refusé — un titre vide, un label inventé,
// des longueurs déraisonnables — car c'est là que se joue la différence entre
// une écriture bornée et une écriture ouverte.
//
// Les données employées sont celles du dépôt réel, relevées à la source : les
// labels `couche/…`, `module/…`, et les quatre natures `spec`, `tech`, `bug`,
// `accessibility`.
import { describe, expect, it } from 'vitest'
import {
  CORPS_MAXIMUM,
  depuisIssue,
  estUneIssue,
  filtrer,
  LABELS_MAXIMUM,
  rangerLabels,
  REFUS,
  TITRE_MAXIMUM,
  validerBrouillon,
} from '../server/utils/tickets'

const LABELS_REELS = [
  'couche/0-socle',
  'couche/1-flux-entrants',
  'module/0.1-organisation',
  'module/1.1-reception',
  'spec',
  'tech',
  'bug',
  'accessibility',
]

const ISSUE_REELLE = {
  number: 1,
  title: 'Réaliser le module 0.1 — Organisation et multi-clients',
  state: 'open',
  labels: [
    { name: 'couche/0-socle' },
    { name: 'module/0.1-organisation' },
    { name: 'tech' },
  ],
  html_url: 'https://github.com/LucasLH1/cairn-wms/issues/1',
  created_at: '2026-09-15T20:07:13Z',
  comments: 0,
}

describe('les labels sont rangés selon la taxinomie du dépôt', () => {
  it('sépare couches, modules et natures de travail', () => {
    expect(rangerLabels(LABELS_REELS)).toEqual({
      couches: ['couche/0-socle', 'couche/1-flux-entrants'],
      modules: ['module/0.1-organisation', 'module/1.1-reception'],
      types: ['accessibility', 'bug', 'spec', 'tech'],
    })
  })

  it('ne présume pas de la liste des natures', () => {
    expect(rangerLabels(['question']).types).toEqual(['question'])
  })
})

describe('une issue de GitHub devient un ticket', () => {
  it('reprend ce que GitHub dit, sans rien inventer', () => {
    expect(depuisIssue(ISSUE_REELLE)).toEqual({
      numero: 1,
      titre: 'Réaliser le module 0.1 — Organisation et multi-clients',
      etat: 'open',
      labels: ['couche/0-socle', 'module/0.1-organisation', 'tech'],
      couche: 'couche/0-socle',
      module: 'module/0.1-organisation',
      types: ['tech'],
      url: 'https://github.com/LucasLH1/cairn-wms/issues/1',
      creeLe: '2026-09-15T20:07:13Z',
      commentaires: 0,
    })
  })

  it('accepte une issue sans label', () => {
    const t = depuisIssue({ number: 9, title: 'Sans étiquette', state: 'closed' })
    expect(t.couche).toBeNull()
    expect(t.module).toBeNull()
    expect(t.types).toEqual([])
    expect(t.etat).toBe('closed')
  })

  it('écarte les pull requests, que l\'API mêle aux issues', () => {
    expect(estUneIssue(ISSUE_REELLE)).toBe(true)
    expect(estUneIssue({ ...ISSUE_REELLE, pull_request: { url: '…' } })).toBe(false)
  })
})

describe('les filtres se combinent', () => {
  const tickets = [
    depuisIssue(ISSUE_REELLE),
    depuisIssue({ ...ISSUE_REELLE, number: 8, state: 'open', labels: [{ name: 'couche/1-flux-entrants' }, { name: 'module/1.1-reception' }, { name: 'spec' }] }),
    depuisIssue({ ...ISSUE_REELLE, number: 99, state: 'closed', labels: [{ name: 'couche/0-socle' }, { name: 'bug' }] }),
  ]

  it('filtre par état', () => {
    expect(filtrer(tickets, { etat: 'open' }).map(t => t.numero)).toEqual([1, 8])
    expect(filtrer(tickets, { etat: 'closed' }).map(t => t.numero)).toEqual([99])
  })

  it('rend tout quand l\'état est « tous »', () => {
    expect(filtrer(tickets, { etat: 'tous' })).toHaveLength(3)
  })

  it('filtre par couche, par module et par nature', () => {
    expect(filtrer(tickets, { couche: 'couche/0-socle' }).map(t => t.numero)).toEqual([1, 99])
    expect(filtrer(tickets, { module: 'module/1.1-reception' }).map(t => t.numero)).toEqual([8])
    expect(filtrer(tickets, { type: 'bug' }).map(t => t.numero)).toEqual([99])
  })

  it('combine plusieurs filtres', () => {
    expect(filtrer(tickets, { etat: 'open', couche: 'couche/0-socle' }).map(t => t.numero)).toEqual([1])
    expect(filtrer(tickets, { etat: 'closed', type: 'spec' })).toEqual([])
  })

  it('ne filtre rien quand aucun filtre n\'est posé', () => {
    expect(filtrer(tickets, {})).toHaveLength(3)
  })
})

describe('un brouillon est vérifié avant d\'écrire chez GitHub', () => {
  it('accepte un titre seul : le corps est facultatif', () => {
    const v = validerBrouillon({ titre: 'Corriger le libellé' }, LABELS_REELS)
    expect(v).toEqual({ ok: true, valeur: { titre: 'Corriger le libellé', corps: '', labels: [] } })
  })

  it('refuse un titre vide, ou fait d\'espaces', () => {
    expect(validerBrouillon({ titre: '' }, LABELS_REELS)).toMatchObject({ ok: false, refus: 'titre-absent' })
    expect(validerBrouillon({ titre: '   ' }, LABELS_REELS)).toMatchObject({ ok: false, refus: 'titre-absent' })
    expect(validerBrouillon({}, LABELS_REELS)).toMatchObject({ ok: false, refus: 'titre-absent' })
  })

  it('coupe les espaces autour du titre', () => {
    const v = validerBrouillon({ titre: '  Un titre  ' }, LABELS_REELS)
    expect(v).toMatchObject({ ok: true, valeur: { titre: 'Un titre' } })
  })

  it('refuse un titre plus long que ce que GitHub accepte', () => {
    const trop = 'a'.repeat(TITRE_MAXIMUM + 1)
    expect(validerBrouillon({ titre: trop }, LABELS_REELS)).toMatchObject({ ok: false, refus: 'titre-trop-long' })
    expect(validerBrouillon({ titre: 'a'.repeat(TITRE_MAXIMUM) }, LABELS_REELS).ok).toBe(true)
  })

  it('refuse un corps démesuré', () => {
    const trop = 'a'.repeat(CORPS_MAXIMUM + 1)
    expect(validerBrouillon({ titre: 'Titre', corps: trop }, LABELS_REELS)).toMatchObject({ ok: false, refus: 'corps-trop-long' })
  })

  it('refuse un label qui n\'existe pas dans le dépôt', () => {
    const v = validerBrouillon({ titre: 'Titre', labels: ['urgent'] }, LABELS_REELS)
    expect(v).toMatchObject({ ok: false, refus: 'label-inconnu', detail: 'urgent' })
  })

  it('accepte les labels existants, et écarte les doublons', () => {
    const v = validerBrouillon({ titre: 'Titre', labels: ['tech', 'tech', 'bug'] }, LABELS_REELS)
    expect(v).toMatchObject({ ok: true, valeur: { labels: ['tech', 'bug'] } })
  })

  it('refuse une avalanche de labels', () => {
    const beaucoup = Array.from({ length: LABELS_MAXIMUM + 1 }, (_, i) => `l${i}`)
    expect(validerBrouillon({ titre: 'Titre', labels: beaucoup }, LABELS_REELS))
      .toMatchObject({ ok: false, refus: 'trop-de-labels' })
  })

  it('a un message pour chaque refus, sans jargon', () => {
    for (const [cause, message] of Object.entries(REFUS)) {
      expect(message.length).toBeGreaterThan(20)
      expect(message).not.toMatch(/\b(422|403|API|HTTP)\b/)
      expect(cause).toBeTruthy()
    }
  })
})
