// Journal local des appels GitHub sortants.
//
// Chaque appel qui part réellement vers GitHub — ceux que le cache n'a pas
// évités — note sa ressource, son statut et ce que GitHub dit du quota. Le
// journal sort sur la console du serveur, et reste en mémoire pour être
// interrogé pendant une épreuve.
//
// Il répond à une question laissée ouverte à la tranche 3 : **une revalidation
// qui rend 304 consomme-t-elle du quota ?** La mesure externe disait oui, le
// diagnostic direct disait non. Seul un relevé pris au moment de l'appel, avec
// le compteur que GitHub renvoie lui-même, peut trancher.

export interface AppelGithub {
  /** Ce qui a été demandé, sans jeton ni paramètre sensible. */
  ressource: string
  statut: number
  /** Ce que GitHub dit avoir décompté, au moment de cette réponse. */
  quotaUtilise: number | null
  quotaRestant: number | null
  quandMs: number
}

/** On ne garde que les derniers : le journal est un outil d'observation, pas une archive. */
const MAXIMUM = 200

const appels: AppelGithub[] = []

function nombreOuNul(valeur: unknown): number | null {
  if (valeur === undefined || valeur === null) return null
  const n = Number(String(valeur))
  return Number.isFinite(n) ? n : null
}

/** Extrait les compteurs de quota d'en-têtes de réponse, quelle qu'en soit la forme. */
export function lireQuota(entetes: unknown): { utilise: number | null, restant: number | null } {
  const e = (entetes ?? {}) as Record<string, unknown>
  return {
    utilise: nombreOuNul(e['x-ratelimit-used']),
    restant: nombreOuNul(e['x-ratelimit-remaining']),
  }
}

/** Note un appel sortant, et l'écrit sur la console du serveur. */
export function noter(
  ressource: string,
  statut: number,
  entetes: unknown,
  quandMs: number = Date.now(),
): AppelGithub {
  const { utilise, restant } = lireQuota(entetes)
  const appel: AppelGithub = { ressource, statut, quotaUtilise: utilise, quotaRestant: restant, quandMs }

  appels.push(appel)
  if (appels.length > MAXIMUM) appels.splice(0, appels.length - MAXIMUM)

  // Une ligne par appel, lisible telle quelle dans les traces du conteneur.
  console.info(
    `[github] ${ressource} → ${statut} · quota utilisé ${utilise ?? '?'} · restant ${restant ?? '?'}`,
  )

  return appel
}

/** Les derniers appels notés, du plus ancien au plus récent. */
export function derniers(combien = MAXIMUM): AppelGithub[] {
  return appels.slice(-combien)
}

/** Pour les tests et les épreuves : repart d'un journal vide. */
export function viderJournal(): void {
  appels.length = 0
}

/**
 * Ce que le journal permet de conclure sur le coût d'une revalidation.
 *
 * Compare le quota décompté avant et après chaque réponse 304 : si le compteur
 * n'a pas bougé, la revalidation est gratuite.
 */
export function coutDesRevalidations(): {
  revalidations: number
  gratuites: number
  payantes: number
  indetermine: number
} {
  let revalidations = 0
  let gratuites = 0
  let payantes = 0
  let indetermine = 0

  for (let i = 0; i < appels.length; i += 1) {
    const appel = appels[i]
    if (!appel || appel.statut !== 304) continue

    revalidations += 1

    // Le dernier appel noté avant celui-ci, quel qu'en soit le statut.
    const precedent = appels[i - 1]
    if (!precedent || precedent.quotaUtilise === null || appel.quotaUtilise === null) {
      indetermine += 1
      continue
    }

    if (appel.quotaUtilise === precedent.quotaUtilise) gratuites += 1
    else payantes += 1
  }

  return { revalidations, gratuites, payantes, indetermine }
}
