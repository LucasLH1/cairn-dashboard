// Le rendu du Markdown est la surface d'attaque de la tranche 2 : la
// documentation vient d'un dépôt public, écrit aussi par des sessions
// automatisées. Ces tests éprouvent ce qui doit être refusé, pas seulement ce
// qui doit s'afficher — un garde-fou qui ne refuse jamais n'est pas prouvé.
import { describe, expect, it } from 'vitest'
import { lienAccepte, rendreMarkdown, resoudreLien } from '../server/utils/markdown'

describe('le HTML brut d\'un document n\'est jamais exécuté', () => {
  it('échappe une balise de script', () => {
    const html = rendreMarkdown('<script>alert(1)</script>', 'README.md')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('échappe une image porteuse de gestionnaire d\'événement', () => {
    const html = rendreMarkdown('Texte <img src=x onerror=alert(1)> suite', 'README.md')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('échappe une balise de style', () => {
    const html = rendreMarkdown('<style>body{display:none}</style>', 'README.md')
    expect(html).not.toContain('<style>')
  })

  it('rend malgré tout le Markdown légitime qui l\'entoure', () => {
    const html = rendreMarkdown('# Titre\n\n<b>gras</b> et **gras**', 'README.md')
    expect(html).toContain('<h1>Titre</h1>')
    expect(html).toContain('<strong>gras</strong>')
    expect(html).toContain('&lt;b&gt;')
  })
})

describe('les liens dangereux sont refusés', () => {
  it('refuse le protocole javascript : aucun lien n\'est créé', () => {
    expect(lienAccepte('javascript:alert(1)')).toBe(false)
    const html = rendreMarkdown('[clic](javascript:alert(1))', 'README.md')
    // Le texte source reste affiché, ce qui est inoffensif ; ce qui compte est
    // qu'aucune balise de lien ne soit produite, donc aucun href à suivre.
    expect(html).not.toContain('<a ')
    expect(html).not.toContain('href=')
  })

  it('refuse les données embarquées et les fichiers locaux', () => {
    expect(lienAccepte('data:text/html;base64,PHNjcmlwdD4=')).toBe(false)
    expect(lienAccepte('vbscript:msgbox(1)')).toBe(false)
    expect(lienAccepte('file:///etc/passwd')).toBe(false)
  })

  it('accepte les protocoles ordinaires', () => {
    expect(lienAccepte('https://github.com')).toBe(true)
    expect(lienAccepte('mailto:personne@exemple.fr')).toBe(true)
    expect(lienAccepte('../glossaire.md')).toBe(true)
  })
})

describe('les liens externes sont neutralisés', () => {
  it('pose nofollow, noopener, noreferrer et un autre onglet', () => {
    const html = rendreMarkdown('[GitHub](https://github.com/LucasLH1)', 'README.md')
    expect(html).toContain('rel="nofollow noopener noreferrer"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('href="https://github.com/LucasLH1"')
  })

  it('traite une adresse électronique comme externe', () => {
    const html = rendreMarkdown('[écrire](mailto:personne@exemple.fr)', 'README.md')
    expect(html).toContain('rel="nofollow noopener noreferrer"')
  })
})

describe('les liens relatifs mènent au document, dans le dashboard', () => {
  it('résout un voisin du même dossier', () => {
    expect(resoudreLien('modele.md', 'decisions/README.md'))
      .toBe('/documentation/decisions/modele.md')
  })

  it('résout une remontée d\'un dossier', () => {
    expect(resoudreLien('../glossaire.md', 'socle/0.1-organisation.md'))
      .toBe('/documentation/glossaire.md')
  })

  it('résout depuis la racine de la documentation', () => {
    expect(resoudreLien('socle/0.4-modele-de-stock.md', 'README.md'))
      .toBe('/documentation/socle/0.4-modele-de-stock.md')
  })

  it('conserve l\'ancre d\'un lien vers une section', () => {
    expect(resoudreLien('../glossaire.md#emplacement', 'socle/0.1-organisation.md'))
      .toBe('/documentation/glossaire.md#emplacement')
  })

  it('laisse une ancre seule telle quelle', () => {
    expect(resoudreLien('#conventions-de-lecture', 'README.md'))
      .toBe('#conventions-de-lecture')
  })

  it('ne réécrit pas une adresse absolue', () => {
    expect(resoudreLien('https://github.com/LucasLH1/cairn-wms', 'README.md')).toBeNull()
    expect(resoudreLien('mailto:personne@exemple.fr', 'README.md')).toBeNull()
  })

  it('réécrit le lien dans le HTML rendu', () => {
    const html = rendreMarkdown('[le glossaire](../glossaire.md)', 'socle/0.1-organisation.md')
    expect(html).toContain('href="/documentation/glossaire.md"')
    expect(html).not.toContain('target="_blank"')
  })
})

describe('le Markdown de cairn-wms est rendu tel qu\'il est écrit', () => {
  it('rend les tableaux, que la documentation emploie partout', () => {
    const html = rendreMarkdown('| Préfixe | Module |\n|---|---|\n| `RG-ORG` | Organisation |', 'README.md')
    expect(html).toContain('<table>')
    expect(html).toContain('<code>RG-ORG</code>')
  })

  it('rend les citations et les listes', () => {
    const html = rendreMarkdown('> Une citation\n\n- un\n- deux', 'README.md')
    expect(html).toContain('<blockquote>')
    expect(html).toContain('<li>un</li>')
  })

  it('rend un bloc de code sans l\'interpréter', () => {
    const html = rendreMarkdown('```\n<script>alert(1)</script>\n```', 'README.md')
    expect(html).toContain('<pre>')
    expect(html).not.toContain('<script>')
  })
})
