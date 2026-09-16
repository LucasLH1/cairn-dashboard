// Le journal lu ici est celui de cairn-wms, dont le format n'est pas le nôtre.
// Ces tests emploient ses entrées réelles, relevées à la source — en-tête à
// `modules`, et le champ `annulee_par` qu'une session porte en plus.
import { describe, expect, it } from 'vitest'
import {
  analyserEntree,
  citations,
  estUneEntree,
  filtrer,
  trier,
} from '../server/utils/journal-wms'

const ENTREE_REELLE = `---
date: 2026-09-15 21:55
objectif: Structurer le dépôt autour de la spécification métier existante, sans arrêter aucun choix technique.
modules: []
issues: [1, 2, 3]
---

# Session du 2026-09-15 — structuration

## Objectif

Structurer le dépôt.
`

const ENTREE_ANNULEE = `---
date: 2026-09-15 22:30
objectif: Verser la logique de déploiement au dépôt.
modules: ["0.1", "1.2"]
issues: []
annulee_par: "8a10a9c"
---

# Session annulée
`

describe('seules les entrées sont des entrées', () => {
  it('reconnaît le nommage de cairn-wms', () => {
    expect(estUneEntree('2026-09-15-2155-structuration-du-depot.md')).toBe(true)
    expect(estUneEntree('2026-09-15-2237-retrait-du-deploiement.md')).toBe(true)
  })

  it('écarte le README, qui contient pourtant un bloc ressemblant à un en-tête', () => {
    // Le prendre pour une entrée afficherait une session qui n'a jamais eu lieu.
    expect(estUneEntree('README.md')).toBe(false)
  })

  it('écarte tout autre document que cairn-wms ajouterait', () => {
    expect(estUneEntree('NOTES.md')).toBe(false)
    expect(estUneEntree('2026-09-15-structuration.md')).toBe(false)
    expect(estUneEntree('brouillon.txt')).toBe(false)
  })
})

describe('une entrée est lue telle que cairn-wms l\'écrit', () => {
  it('lit les champs de son en-tête, « modules » et non « tranches »', () => {
    const e = analyserEntree(ENTREE_REELLE, '2026-09-15-2155-structuration-du-depot.md')
    expect(e.date).toBe('2026-09-15 21:55')
    expect(e.objectif).toMatch(/^Structurer le dépôt/)
    expect(e.modules).toEqual([])
    expect(e.issues).toEqual([1, 2, 3])
  })

  it('conserve un champ que nous n\'avions pas prévu', () => {
    const e = analyserEntree(ENTREE_ANNULEE, '2026-09-15-2230-deploiement.md')
    expect(e.autres).toEqual({ annulee_par: '8a10a9c' })
    expect(e.modules).toEqual(['0.1', '1.2'])
  })

  it('sépare le corps de l\'en-tête', () => {
    const e = analyserEntree(ENTREE_REELLE, '2026-09-15-2155-structuration-du-depot.md')
    expect(e.corps.startsWith('# Session du 2026-09-15')).toBe(true)
    expect(e.corps).not.toContain('objectif:')
  })

  it('tire le sujet du nom du fichier', () => {
    const e = analyserEntree(ENTREE_REELLE, '2026-09-15-2155-structuration-du-depot.md')
    expect(e.sujet).toBe('structuration du depot')
  })

  it('retombe sur la date du nom quand l\'en-tête n\'en porte pas', () => {
    const e = analyserEntree('# Sans en-tête', '2026-09-16-0830-une-session.md')
    expect(e.date).toBe('2026-09-16 08:30')
    expect(e.objectif).toBeNull()
  })

  it('ne casse pas sur un en-tête illisible : l\'entrée reste lisible', () => {
    const e = analyserEntree('---\nobjectif: [non fermé\n---\n\n# Corps', '2026-09-16-0900-test.md')
    expect(e.objectif).toBeNull()
    expect(e.corps).toBe('# Corps')
  })
})

describe('les entrées se retrouvent et s\'ordonnent', () => {
  const entrees = [
    analyserEntree(ENTREE_REELLE, '2026-09-15-2155-structuration-du-depot.md'),
    analyserEntree(ENTREE_ANNULEE, '2026-09-15-2230-deploiement.md'),
    analyserEntree('---\nmodules: ["0.1"]\nissues: [3]\n---\n\n# Trois', '2026-09-16-0800-troisieme.md'),
  ]

  it('range de la plus récente à la plus ancienne', () => {
    expect(trier(entrees).map(e => e.fichier)).toEqual([
      '2026-09-16-0800-troisieme.md',
      '2026-09-15-2230-deploiement.md',
      '2026-09-15-2155-structuration-du-depot.md',
    ])
  })

  it('retrouve les sessions par module', () => {
    expect(filtrer(entrees, { module: '0.1' }).map(e => e.fichier)).toEqual([
      '2026-09-15-2230-deploiement.md',
      '2026-09-16-0800-troisieme.md',
    ])
  })

  it('retrouve les sessions par issue', () => {
    expect(filtrer(entrees, { issue: 3 })).toHaveLength(2)
    expect(filtrer(entrees, { issue: 99 })).toEqual([])
  })

  it('combine module et issue', () => {
    expect(filtrer(entrees, { module: '0.1', issue: 3 }).map(e => e.fichier))
      .toEqual(['2026-09-16-0800-troisieme.md'])
  })

  it('ne filtre rien sans filtre', () => {
    expect(filtrer(entrees, {})).toHaveLength(3)
  })

  it('ne propose que des modules et des issues réellement cités', () => {
    expect(citations(entrees)).toEqual({ modules: ['0.1', '1.2'], issues: [1, 2, 3] })
  })
})
