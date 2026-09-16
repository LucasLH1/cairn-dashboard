// Ce qui répond sans connexion — cadrage, principe 4.
// Tout le reste exige une session : la liste est courte et fermée.

const CHEMINS_EXACTS = new Set([
  '/version',
  '/health',
  '/live', // contrôle de santé du conteneur : il doit répondre sans session
  '/connexion',
  '/refus',
  '/favicon.svg',
])

const PREFIXES = [
  '/auth/', // parcours de connexion et de déconnexion
  '/_nuxt/', // ressources de l'interface
  '/fonts/', // polices du design
  // Réception des webhooks : GitHub n'a pas de session. C'est la seule porte
  // ouverte du dashboard, et sa protection est ailleurs — signature HMAC,
  // taille bornée, événements en liste fermée (server/utils/webhook.ts).
  '/webhooks/',
]

/** Vrai si ce chemin répond sans session ouverte. */
export function cheminPublic(chemin: string): boolean {
  if (CHEMINS_EXACTS.has(chemin)) return true
  return PREFIXES.some(prefixe => chemin.startsWith(prefixe))
}
