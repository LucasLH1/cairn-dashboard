// La sonde doit éprouver une lecture réelle, pas seulement un jeton accepté.
//
// Pourquoi : un jeton peut être valide — donc accepté sur `/repos/{depot}`, qui
// ne demande que la métadonnée — sans avoir le droit de lire le contenu des
// fichiers. La sonde répondait alors 200 pendant que chaque écran affichait un
// refus. C'est exactement ce qui a rendu nécessaire une vérification humaine à
// la livraison de la tranche 2.
//
// Le coût est maîtrisé : le résultat est retenu une minute, et la lecture passe
// par le cache conditionnel — une revalidation qui répond 304 ne consomme pas de
// quota. La sonde de l'image tourne toutes les trente secondes ; sans ce cache,
// elle mangerait le quota à elle seule.
import { creerCache, servir } from './cache-github'
import { interpreterErreur } from './doc-github'
import type { EchecTransport } from './doc-github'

/**
 * La sonde ne juge que la lecture : elle ne connaît donc que les causes de
 * transport, jamais `illisible`, qui relève de la forme du contenu.
 */
export type EtatLecture = EchecTransport | 'ok'

/**
 * Fichier lu pour éprouver le droit de lecture : le suivi de cairn-wms, que la
 * tranche 3 affiche de toute façon. Le lire ici ne coûte donc rien de plus.
 */
export const TEMOIN = 'status.yml'

/** Durée pendant laquelle le verdict est réemployé sans rien relire. */
export const RETENUE_MS = 60_000

const cache = creerCache<EtatLecture>()

/** Pour les tests : repart d'un verdict inconnu. */
export function viderSante(): void {
  cache.vider()
}

/**
 * Éprouve une lecture réelle et rend son verdict.
 *
 * `lire` est injecté : les tests éprouvent les refus sans réseau, et la sonde
 * n'a pas à connaître Octokit.
 */
export async function verifierLecture(
  lire: () => Promise<string>,
  configure: boolean,
  maintenant: () => number = () => Date.now(),
): Promise<EtatLecture> {
  if (!configure) return 'non-configure'

  const { valeur } = await servir<EtatLecture>(
    cache,
    TEMOIN,
    async () => {
      try {
        const contenu = await lire()
        // Un contenu vide n'est pas une lecture réussie : le droit peut être là
        // sans que le fichier le soit.
        return { modifie: true as const, valeur: contenu.length > 0 ? 'ok' : 'absent', etag: null }
      }
      catch (erreur) {
        return { modifie: true as const, valeur: interpreterErreur(erreur), etag: null }
      }
    },
    maintenant,
    RETENUE_MS,
  )

  return valeur
}
