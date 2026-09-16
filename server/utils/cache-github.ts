// Cache court des lectures GitHub, avec requêtes conditionnelles.
//
// Ce qui économise réellement, c'est la **fenêtre de fraîcheur** : pendant
// trente secondes, une lecture répétée ne sort pas du serveur. Mesuré : cinq
// lectures successives ne coûtent qu'un seul appel.
//
// **La revalidation par ETag, elle, n'est pas gratuite.** On a d'abord cru
// l'inverse ; le journal des appels sortants a tranché, compteur en main :
//
//     [github] arbre → 200 · quota utilisé 18
//     [github] arbre → 304 · quota utilisé 19
//
// Le 304 est décompté comme un appel ordinaire. L'ETag garde son intérêt — le
// corps n'est pas retransmis, donc moins de données et une réponse plus rapide —
// mais il n'épargne pas le quota. Toute économie de quota vient de la fenêtre.
//
// La durée reste **courte, trente secondes** : la documentation et le suivi de
// cairn-wms changent au rythme des sessions de travail, et le cadrage exige
// qu'une modification poussée sur `dev` soit visible sans redéployer. L'allonger
// économiserait davantage, au prix de la fraîcheur — arbitrage à rouvrir si le
// quota devenait serré, ce qu'il n'est pas à 5 000 appels par heure.
//
// Le cache vit en mémoire du serveur : il disparaît à chaque redéploiement, ce
// qui est voulu — il n'est pas une donnée, seulement une économie.

/** Ce qu'on retient d'une lecture. */
export interface EntreeCache<T> {
  valeur: T
  etag: string | null
  /** Horodatage de la dernière fois où la valeur a été sue à jour. */
  confirmee: number
}

/** Ce qu'une revalidation rapporte : soit rien n'a changé, soit voici la suite. */
export type Revalidation<T> =
  | { modifie: false }
  | { modifie: true, valeur: T, etag: string | null }

export interface Cache<T> {
  entree: (cle: string) => EntreeCache<T> | undefined
  poser: (cle: string, entree: EntreeCache<T>) => void
  oublier: (cle: string) => void
  vider: () => void
  taille: () => number
}

/** Durée pendant laquelle une valeur est servie sans rien demander à GitHub. */
export const FRAICHEUR_MS = 30_000

export function creerCache<T>(): Cache<T> {
  const entrees = new Map<string, EntreeCache<T>>()

  return {
    entree: cle => entrees.get(cle),
    poser: (cle, entree) => {
      entrees.set(cle, entree)
    },
    oublier: (cle) => {
      entrees.delete(cle)
    },
    vider: () => entrees.clear(),
    taille: () => entrees.size,
  }
}

/** Vrai tant que la valeur peut être servie sans demander quoi que ce soit. */
export function estFrais(
  entree: EntreeCache<unknown> | undefined,
  maintenant: number,
  fraicheurMs = FRAICHEUR_MS,
): boolean {
  if (!entree) return false
  return maintenant - entree.confirmee < fraicheurMs
}

/** Ce qui s'est passé pour servir une lecture — sert à l'éprouver. */
export type Origine = 'cache' | 'revalide' | 'lu'

export interface Resultat<T> {
  valeur: T
  origine: Origine
}

/**
 * Sert une lecture, en demandant à GitHub le moins possible.
 *
 * - dans la fenêtre de fraîcheur : la valeur en cache, sans aucun appel ;
 * - au-delà : une requête conditionnelle. Si la source n'a pas changé, GitHub
 *   répond 304 — gratuit — et la valeur en cache est reconduite ;
 * - sinon : la nouvelle valeur remplace l'ancienne.
 */
export async function servir<T>(
  cache: Cache<T>,
  cle: string,
  revalider: (etag: string | null) => Promise<Revalidation<T>>,
  maintenant: () => number = () => Date.now(),
  fraicheurMs = FRAICHEUR_MS,
): Promise<Resultat<T>> {
  const connue = cache.entree(cle)

  if (connue && estFrais(connue, maintenant(), fraicheurMs)) {
    return { valeur: connue.valeur, origine: 'cache' }
  }

  const suite = await revalider(connue?.etag ?? null)

  if (!suite.modifie) {
    if (!connue) {
      throw new Error('revalidation sans changement alors que rien n\'était en cache')
    }
    // Rien n'a bougé : on repousse l'échéance sans toucher à la valeur.
    cache.poser(cle, { ...connue, confirmee: maintenant() })
    return { valeur: connue.valeur, origine: 'revalide' }
  }

  cache.poser(cle, { valeur: suite.valeur, etag: suite.etag, confirmee: maintenant() })
  return { valeur: suite.valeur, origine: 'lu' }
}

/** Vrai si l'erreur rendue par Octokit est un « rien n'a changé ». */
export function estNonModifie(erreur: unknown): boolean {
  return (erreur as { status?: number })?.status === 304
}
