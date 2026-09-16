// Ce qui répond sans connexion — cadrage, principe 4.
// Tout le reste exige une session : la liste est courte et fermée.

const CHEMINS_EXACTS = new Set([
  '/version',
  '/health',
  '/connexion',
  '/refus',
  '/favicon.svg',
])

const PREFIXES = [
  '/auth/', // parcours de connexion et de déconnexion
  '/_nuxt/', // ressources de l'interface
  '/fonts/', // polices du design
]

/** Vrai si ce chemin répond sans session ouverte. */
export function cheminPublic(chemin: string): boolean {
  if (CHEMINS_EXACTS.has(chemin)) return true
  return PREFIXES.some(prefixe => chemin.startsWith(prefixe))
}
