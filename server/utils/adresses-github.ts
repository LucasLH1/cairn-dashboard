// Adresses de GitHub — fiche 0010.
//
// En production, ce sont les adresses réelles, et rien ne peut les changer.
// Deux verrous indépendants :
//
//   - `import.meta.dev` vaut `false` à la construction de l'image : la branche
//     qui lit la configuration disparaît du code servi ;
//   - les clés lues n'existent que sous `$development` (nuxt.config.ts). Une
//     variable NUXT_* ne peut que remplacer une clé qui existe, jamais en créer
//     une.
//
// En développement, `npm run dev:fictif` les fait pointer vers le faux GitHub du
// poste (scripts/dev/). Le test de fumée éprouve que l'image les ignore.

export const API_GITHUB = 'https://api.github.com'
export const WEB_GITHUB = 'https://github.com'

function substitut(cle: 'githubApiUrl' | 'githubWebUrl'): string | null {
  if (!import.meta.dev) return null
  const valeur = String((useRuntimeConfig() as Record<string, unknown>)[cle] ?? '').trim()
  return valeur === '' ? null : valeur.replace(/\/+$/, '')
}

/** L'adresse de l'API : `https://api.github.com`, hors développement. */
export function adresseApi(): string {
  return substitut('githubApiUrl') ?? API_GITHUB
}

/** L'adresse du site, qui porte le parcours OAuth : `https://github.com`, hors développement. */
export function adresseWeb(): string {
  return substitut('githubWebUrl') ?? WEB_GITHUB
}
