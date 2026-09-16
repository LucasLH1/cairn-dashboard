// Rendu du Markdown de cairn-wms — fiche 0004.
//
// markdown-it dans sa configuration par défaut : `html` y vaut `false`, et les
// deux règles qui reconnaissent le HTML — `html_block` et `html_inline` —
// sortent immédiatement quand l'option est fausse. Le HTML brut d'un document
// n'est donc jamais émis : il retombe en texte, échappé. **On ne l'active
// jamais** : c'est toute la sûreté de cette tranche.
//
// Les liens, eux, sont réécrits :
//   - relatif    → le document correspondant, dans le dashboard ;
//   - externe    → conservé, mais sans pouvoir servir de levier : `nofollow`,
//                  `noopener`, `noreferrer`, et ouverture dans un autre onglet ;
//   - dangereux  → markdown-it refuse déjà `javascript:`, `vbscript:`, `file:`
//                  et `data:` par son contrôle de lien ; le texte reste affiché,
//                  sans lien. Le test le vérifie plutôt que de le supposer.
import MarkdownIt from 'markdown-it'

/** Racine de navigation dans le dashboard. Les chemins sont relatifs à `docs/`. */
export const RACINE_DOC = '/documentation'

const moteur = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false,
})

/** Le dossier d'un chemin, sans le nom de fichier. */
function dossierDe(chemin: string): string {
  const coupe = chemin.lastIndexOf('/')
  return coupe === -1 ? '' : chemin.slice(0, coupe)
}

/**
 * Résout un lien écrit dans un document.
 *
 * Rend l'adresse à employer dans le dashboard pour un lien interne, ou `null`
 * si le lien mène ailleurs — auquel cas il est traité comme externe.
 */
export function resoudreLien(href: string, cheminDocument: string): string | null {
  if (!href) return null
  if (href.startsWith('#')) return href

  let cible: URL
  try {
    cible = new URL(href, `doc:/${dossierDe(cheminDocument)}/`)
  }
  catch {
    return null
  }

  // Une adresse absolue change de protocole : elle sort du dépôt.
  if (cible.protocol !== 'doc:') return null

  const chemin = cible.pathname.replace(/^\/+/, '')
  if (!chemin) return null

  return `${RACINE_DOC}/${chemin}${cible.hash}`
}

/** Vrai si markdown-it a retenu le lien, faux s'il l'a refusé comme dangereux. */
export function lienAccepte(href: string): boolean {
  return moteur.validateLink(href)
}

/**
 * Rend en HTML le Markdown d'un document.
 *
 * `cheminDocument` est le chemin du document lu, relatif à `docs/` — il sert à
 * résoudre les liens relatifs d'un document à l'autre.
 */
export function rendreMarkdown(source: string, cheminDocument: string): string {
  const rendu = new MarkdownIt({ html: false, linkify: false, typographer: false })

  const parDefaut = rendu.renderer.rules.link_open
    ?? ((tokens, i, options, _env, self) => self.renderToken(tokens, i, options))

  rendu.renderer.rules.link_open = (tokens, i, options, env, self) => {
    const jeton = tokens[i]
    // `attrGet` peut rendre autre chose qu'une chaîne : on convertit plutôt que
    // de supposer, comme partout ailleurs dans ce dépôt.
    const href = String(jeton?.attrGet('href') ?? '')
    const interne = resoudreLien(href, cheminDocument)

    if (interne) {
      jeton?.attrSet('href', interne)
    }
    else {
      // Externe : lisible, mais neutralisé.
      jeton?.attrSet('rel', 'nofollow noopener noreferrer')
      jeton?.attrSet('target', '_blank')
    }

    return parDefaut(tokens, i, options, env, self)
  }

  return rendu.render(source)
}
