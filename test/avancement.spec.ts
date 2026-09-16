// L'avancement est ce que le dashboard prétend savoir du projet : il doit
// refuser d'afficher ce qu'il n'a pas compris. Ces tests éprouvent surtout les
// refus — un fichier illisible, une forme inattendue, un état inconnu.
//
// L'extrait employé est celui du `status.yml` réel de cairn-wms, relevé à la
// source : couches numériques, identifiants de modules entre guillemets, `doc`
// parfois nul.
import { describe, expect, it } from 'vitest'
import {
  analyserAvancement,
  cheminDocumentation,
  compter,
  ErreurAvancement,
  ETATS,
} from '../server/utils/avancement'

const REEL = `
# Avancement de Cairn WMS
projet: Cairn WMS
mis_a_jour_le: 2026-09-15

couches:

  - id: 0
    nom: Socle transverse
    jalon: Couche 0 — Socle transverse
    modules:
      - id: "0.1"
        nom: Organisation et multi-clients
        etat: spécifié
        issue: 1
        doc: docs/socle/0.1-organisation.md
        prefixe_regles: RG-ORG
      - id: "0.2"
        nom: Référentiel produit
        etat: spécifié
        issue: 2
        doc: docs/socle/0.2-referentiel-produit.md
        prefixe_regles: RG-REF

  - id: 2
    nom: Cœur stock
    jalon: Couche 2 — Cœur stock
    modules:
      - id: "2.1"
        nom: Mouvements et transferts
        etat: à faire
        issue: 12
        doc: null
`

describe('le format réel de cairn-wms est lu tel qu\'il est', () => {
  it('reconnaît les quatre états que son en-tête déclare', () => {
    expect([...ETATS]).toEqual(['à faire', 'spécifié', 'en développement', 'livré'])
  })

  it('lit le projet et sa date de mise à jour', () => {
    const a = analyserAvancement(REEL)
    expect(a.projet).toBe('Cairn WMS')
    expect(a.misAJourLe).toBe('2026-09-15')
  })

  it('garde les couches dans l\'ordre du fichier, pas dans l\'ordre alphabétique', () => {
    const a = analyserAvancement(REEL)
    expect(a.couches.map(c => c.id)).toEqual(['0', '2'])
    expect(a.couches[0]?.nom).toBe('Socle transverse')
  })

  it('lit chaque module avec son état, son issue et son préfixe de règles', () => {
    const m = analyserAvancement(REEL).couches[0]?.modules[0]
    expect(m).toMatchObject({
      id: '0.1',
      nom: 'Organisation et multi-clients',
      etat: 'spécifié',
      issue: 1,
      prefixeRegles: 'RG-ORG',
    })
  })

  it('accepte un module sans document', () => {
    const m = analyserAvancement(REEL).couches[1]?.modules[0]
    expect(m?.doc).toBeNull()
    expect(m?.etat).toBe('à faire')
  })
})

describe('le chemin du document est celui qu\'attend la consultation', () => {
  it('retire le préfixe docs/, que cairn-wms écrit depuis sa racine', () => {
    expect(cheminDocumentation('docs/socle/0.1-organisation.md')).toBe('socle/0.1-organisation.md')
  })

  it('rend null quand il n\'y a pas de document', () => {
    expect(cheminDocumentation(null)).toBeNull()
    expect(cheminDocumentation('')).toBeNull()
  })

  it('refuse un chemin qui ne vient pas de docs/', () => {
    expect(cheminDocumentation('ailleurs/fichier.md')).toBeNull()
    expect(cheminDocumentation('/etc/passwd')).toBeNull()
  })
})

describe('un état inconnu est signalé, jamais deviné', () => {
  it('conserve ce qui était écrit et ne le range dans aucun état connu', () => {
    const source = REEL.replace('etat: spécifié', 'etat: en cours de rédaction')
    const m = analyserAvancement(source).couches[0]?.modules[0]
    expect(m?.etat).toBeNull()
    expect(m?.etatBrut).toBe('en cours de rédaction')
  })

  it('compte les inconnus à part', () => {
    const source = REEL.replace('etat: spécifié', 'etat: inconnu')
    expect(compter(analyserAvancement(source)).inconnus).toBe(1)
  })

  it('traite un état absent comme inconnu', () => {
    const source = REEL.replace('        etat: à faire\n', '')
    const m = analyserAvancement(source).couches[1]?.modules[0]
    expect(m?.etat).toBeNull()
    expect(m?.etatBrut).toBe('')
  })
})

describe('un fichier qu\'on ne comprend pas ne s\'affiche pas comme vide', () => {
  it('refuse ce qui n\'est pas du YAML', () => {
    expect(() => analyserAvancement('{ ceci: [n\'est pas')).toThrow(ErreurAvancement)
  })

  it('refuse un fichier sans couches', () => {
    expect(() => analyserAvancement('projet: Cairn WMS\n')).toThrow(/couches/)
  })

  it('refuse une liste à la racine', () => {
    expect(() => analyserAvancement('- un\n- deux\n')).toThrow(ErreurAvancement)
  })

  it('refuse une couche sans modules', () => {
    expect(() => analyserAvancement('couches:\n  - id: 0\n    nom: Socle\n')).toThrow(/modules/)
  })

  it('refuse un module sans nom', () => {
    const source = 'couches:\n  - id: 0\n    nom: Socle\n    modules:\n      - id: "0.1"\n        etat: spécifié\n'
    expect(() => analyserAvancement(source)).toThrow(/sans nom/)
  })

  it('refuse un fichier vide', () => {
    expect(() => analyserAvancement('')).toThrow(ErreurAvancement)
  })
})

describe('la vue d\'ensemble compte ce qui existe', () => {
  it('totalise les modules et les range par état', () => {
    const c = compter(analyserAvancement(REEL))
    expect(c.total).toBe(3)
    expect(c.parEtat).toEqual({ 'spécifié': 2, 'à faire': 1 })
    expect(c.inconnus).toBe(0)
  })
})
