// Un ticket créé depuis le dashboard doit se ranger comme cairn-wms range son
// travail. Ces tests éprouvent la déduction, mais surtout ses refus : une
// déduction fausse poserait des labels que personne n'a vus dans l'aperçu.
//
// Les données sont celles du dépôt réel, relevées à la source : six jalons
// titrés comme les champs `jalon` du suivi, et des labels `couche/<id>-` et
// `module/<id>-` qui se raccordent un à un.
import { describe, expect, it } from 'vitest'
import {
  construireOrganisation,
  coucheDuModule,
  deduire,
  NATURES,
  REFUS_COHERENCE,
  verifierCoherence,
} from '../server/utils/organisation'
import type { Avancement } from '../server/utils/avancement'

const AVANCEMENT: Avancement = {
  projet: 'Cairn WMS',
  misAJourLe: '2026-09-15',
  couches: [
    {
      id: '0',
      nom: 'Socle transverse',
      jalon: 'Couche 0 — Socle transverse',
      modules: [
        { id: '0.1', nom: 'Organisation et multi-clients', etat: 'spécifié', etatBrut: 'spécifié', issue: 1, doc: 'socle/0.1-organisation.md', prefixeRegles: 'RG-ORG' },
        { id: '0.2', nom: 'Référentiel produit', etat: 'spécifié', etatBrut: 'spécifié', issue: 2, doc: null, prefixeRegles: 'RG-REF' },
      ],
    },
    {
      id: '2',
      nom: 'Cœur stock',
      jalon: 'Couche 2 — Cœur stock',
      modules: [
        { id: '2.1', nom: 'Mouvements et transferts', etat: 'à faire', etatBrut: 'à faire', issue: 12, doc: null, prefixeRegles: null },
      ],
    },
  ],
}

const LABELS = [
  'couche/0-socle',
  'couche/2-coeur-stock',
  'module/0.1-organisation',
  'module/0.2-referentiel-produit',
  'module/2.1-mouvements-transferts',
  'spec',
  'tech',
  'bug',
  'accessibility',
]

const JALONS = [
  { numero: 1, titre: 'Couche 0 — Socle transverse' },
  { numero: 3, titre: 'Couche 2 — Cœur stock' },
]

const ORG = construireOrganisation(AVANCEMENT, LABELS, JALONS)

describe('l\'organisation croise le suivi, les labels et les jalons', () => {
  it('raccorde chaque couche à son label et à son jalon', () => {
    expect(ORG.couches.map(c => [c.id, c.label, c.jalonNumero])).toEqual([
      ['0', 'couche/0-socle', 1],
      ['2', 'couche/2-coeur-stock', 3],
    ])
  })

  it('raccorde chaque module à son label', () => {
    expect(ORG.couches[0]?.modules.map(m => m.label)).toEqual([
      'module/0.1-organisation',
      'module/0.2-referentiel-produit',
    ])
  })

  it('ne propose que les natures qui existent dans le dépôt', () => {
    expect(ORG.natures).toEqual([...NATURES])
    const sansBug = construireOrganisation(AVANCEMENT, LABELS.filter(l => l !== 'bug'), JALONS)
    expect(sansBug.natures).toEqual(['spec', 'tech'])
  })

  it('laisse à null ce qui ne se raccorde pas, plutôt que de deviner', () => {
    const sansLabelCouche = construireOrganisation(AVANCEMENT, LABELS.filter(l => l !== 'couche/0-socle'), JALONS)
    expect(sansLabelCouche.couches[0]?.label).toBeNull()
  })

  it('écarte un module sans label : il ne pourra pas être choisi', () => {
    const ampute = construireOrganisation(AVANCEMENT, LABELS.filter(l => l !== 'module/0.2-referentiel-produit'), JALONS)
    expect(ampute.couches[0]?.modules.map(m => m.id)).toEqual(['0.1'])
  })

  it('laisse le jalon à null quand aucun ne porte ce titre', () => {
    const sansJalon = construireOrganisation(AVANCEMENT, LABELS, [])
    expect(sansJalon.couches[0]?.jalonNumero).toBeNull()
  })

  it('retrouve la couche d\'un module', () => {
    expect(coucheDuModule('2.1', ORG)?.id).toBe('2')
    expect(coucheDuModule('9.9', ORG)).toBeNull()
  })
})

describe('la déduction pose ce que cairn-wms attend', () => {
  it('déduit la couche et le jalon à partir du module', () => {
    expect(deduire('tech', '0.1', ORG)).toEqual({
      labels: ['tech', 'couche/0-socle', 'module/0.1-organisation'],
      jalon: 'Couche 0 — Socle transverse',
      jalonNumero: 1,
    })
  })

  it('accepte « aucun module » : la nature seule, sans jalon', () => {
    expect(deduire('bug', null, ORG)).toEqual({ labels: ['bug'], jalon: null, jalonNumero: null })
  })

  it('refuse un module inconnu', () => {
    expect(deduire('tech', '9.9', ORG)).toBeNull()
  })

  it('refuse une nature qui n\'existe pas dans le dépôt', () => {
    // `accessibility` est un label réel, mais n'est pas proposé à la création.
    expect(deduire('accessibility' as never, '0.1', ORG)).toBeNull()
  })
})

describe('le serveur vérifie ce que l\'écran a annoncé', () => {
  it('accepte une annonce conforme', () => {
    const v = verifierCoherence(
      { nature: 'tech', module: '0.1', labels: ['tech', 'couche/0-socle', 'module/0.1-organisation'], jalonNumero: 1 },
      ORG,
    )
    expect(v).toMatchObject({ ok: true, deduction: { jalonNumero: 1 } })
  })

  it('accepte une demande qui n\'annonce rien', () => {
    const v = verifierCoherence({ nature: 'spec', module: '2.1' }, ORG)
    expect(v).toMatchObject({ ok: true, deduction: { labels: ['spec', 'couche/2-coeur-stock', 'module/2.1-mouvements-transferts'] } })
  })

  it('refuse des labels qui ne correspondent pas au module', () => {
    const v = verifierCoherence(
      { nature: 'tech', module: '0.1', labels: ['tech', 'couche/2-coeur-stock', 'module/0.1-organisation'] },
      ORG,
    )
    expect(v).toMatchObject({ ok: false, refus: 'labels-incoherents' })
  })

  it('refuse un jalon qui n\'est pas celui de la couche', () => {
    const v = verifierCoherence(
      { nature: 'tech', module: '0.1', labels: ['tech', 'couche/0-socle', 'module/0.1-organisation'], jalonNumero: 3 },
      ORG,
    )
    expect(v).toMatchObject({ ok: false, refus: 'jalon-incoherent', detail: '3' })
  })

  it('refuse un module inconnu et une nature inconnue', () => {
    expect(verifierCoherence({ nature: 'tech', module: '9.9' }, ORG)).toMatchObject({ ok: false, refus: 'module-inconnu' })
    expect(verifierCoherence({ nature: 'urgent', module: '0.1' }, ORG)).toMatchObject({ ok: false, refus: 'nature-inconnue' })
  })

  it('traite une chaîne vide comme « aucun module »', () => {
    expect(verifierCoherence({ nature: 'bug', module: '' }, ORG)).toMatchObject({ ok: true, deduction: { labels: ['bug'] } })
  })

  it('ne se laisse pas tromper par l\'ordre des labels annoncés', () => {
    const v = verifierCoherence(
      { nature: 'tech', module: '0.1', labels: ['module/0.1-organisation', 'tech', 'couche/0-socle'] },
      ORG,
    )
    expect(v).toMatchObject({ ok: true })
  })

  it('a un message pour chaque refus, sans jargon', () => {
    for (const message of Object.values(REFUS_COHERENCE)) {
      expect(message.length).toBeGreaterThan(20)
      expect(message).not.toMatch(/\b(422|HTTP|API)\b/)
    }
  })
})
