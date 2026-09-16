// La lecture de la documentation doit savoir dire pourquoi elle échoue : un
// quota épuisé, un jeton refusé et un document absent n'appellent pas la même
// réponse à l'écran. Les codes éprouvés ici sont ceux que l'API GitHub renvoie
// réellement, relevés sur le dépôt cairn-wms.
import { describe, expect, it } from 'vitest'
import {
  cheminSur,
  interpreterErreur,
  nomDepuisChemin,
  organiserArbre,
} from '../server/utils/doc-github'

describe('les échecs de GitHub sont traduits', () => {
  it('reconnaît un jeton refusé', () => {
    expect(interpreterErreur({ status: 401 })).toBe('refuse')
  })

  it('reconnaît un document absent', () => {
    expect(interpreterErreur({ status: 404 })).toBe('absent')
  })

  it('distingue le quota épuisé de l\'accès refusé, tous deux en 403', () => {
    const quota = { status: 403, response: { headers: { 'x-ratelimit-remaining': '0' } } }
    const refus = { status: 403, response: { headers: { 'x-ratelimit-remaining': '4321' } } }
    expect(interpreterErreur(quota)).toBe('quota')
    expect(interpreterErreur(refus)).toBe('refuse')
  })

  it('traite 429 avec quota épuisé comme un quota', () => {
    const trop = { status: 429, response: { headers: { 'x-ratelimit-remaining': '0' } } }
    expect(interpreterErreur(trop)).toBe('quota')
  })

  it('traite une panne réseau comme injoignable', () => {
    expect(interpreterErreur(new Error('fetch failed'))).toBe('injoignable')
    expect(interpreterErreur(undefined)).toBe('injoignable')
  })
})

describe('le chemin demandé ne peut pas sortir de docs/', () => {
  it('accepte un document ordinaire', () => {
    expect(cheminSur('socle/0.1-organisation.md')).toBe(true)
    expect(cheminSur('README.md')).toBe(true)
  })

  it('refuse une remontée de dossier', () => {
    expect(cheminSur('../.env')).toBe(false)
    expect(cheminSur('socle/../../secrets.md')).toBe(false)
  })

  it('refuse un chemin absolu, un antislash ou un octet nul', () => {
    expect(cheminSur('/etc/passwd')).toBe(false)
    expect(cheminSur('socle\\0.1.md')).toBe(false)
    expect(cheminSur('socle/0.1.md\0.png')).toBe(false)
  })

  it('refuse ce qui n\'est pas un document Markdown', () => {
    expect(cheminSur('image.png')).toBe(false)
    expect(cheminSur('')).toBe(false)
  })
})

describe('l\'arborescence est rangée pour l\'affichage', () => {
  // Reprise de l'arborescence réelle de cairn-wms, relevée sur dev.
  const entrees = [
    { path: 'README.md', type: 'blob', size: 100 },
    { path: 'docs/README.md', type: 'blob', size: 5538 },
    { path: 'docs/glossaire.md', type: 'blob', size: 16500 },
    { path: 'docs/decisions', type: 'tree' },
    { path: 'docs/decisions/README.md', type: 'blob', size: 3508 },
    { path: 'docs/decisions/modele.md', type: 'blob', size: 1899 },
    { path: 'docs/socle/0.1-organisation.md', type: 'blob', size: 15102 },
    { path: 'docs/socle/0.2-referentiel-produit.md', type: 'blob', size: 19535 },
    { path: 'docs/image.png', type: 'blob', size: 900 },
  ]

  it('ne retient que le Markdown de docs/', () => {
    const groupes = organiserArbre(entrees)
    const chemins = groupes.flatMap(g => g.documents.map(d => d.chemin))
    expect(chemins).not.toContain('image.png')
    expect(chemins.some(c => c.includes('..'))).toBe(false)
    // Le README de la racine du dépôt n'est pas dans docs/ : il est écarté.
    expect(chemins.filter(c => c === 'README.md')).toHaveLength(1)
  })

  it('place la racine en premier, puis les dossiers par ordre alphabétique', () => {
    const groupes = organiserArbre(entrees)
    expect(groupes.map(g => g.dossier)).toEqual([null, 'decisions', 'socle'])
  })

  it('nomme les documents par leur fichier, sans extension ni invention', () => {
    const groupes = organiserArbre(entrees)
    const socle = groupes.find(g => g.dossier === 'socle')
    expect(socle?.documents.map(d => d.nom)).toEqual(['0.1-organisation', '0.2-referentiel-produit'])
  })

  it('conserve la taille annoncée par GitHub', () => {
    const groupes = organiserArbre(entrees)
    const racine = groupes.find(g => g.dossier === null)
    expect(racine?.documents.find(d => d.chemin === 'glossaire.md')?.taille).toBe(16500)
  })

  it('ne rend aucun groupe quand docs/ est vide', () => {
    expect(organiserArbre([{ path: 'README.md', type: 'blob' }])).toEqual([])
  })
})

describe('le nom affiché vient du fichier', () => {
  it('retire l\'extension', () => {
    expect(nomDepuisChemin('socle/0.4-modele-de-stock.md')).toBe('0.4-modele-de-stock')
  })

  it('fonctionne à la racine', () => {
    expect(nomDepuisChemin('glossaire.md')).toBe('glossaire')
  })
})
