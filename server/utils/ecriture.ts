// Garde-fous des écritures — tranche 4, la première du dashboard.
//
// Jusqu'ici le dashboard ne faisait que lire : une requête mal intentionnée ne
// pouvait rien casser. Écrire change la donne, et deux risques apparaissent.
//
// 1. **L'origine.** Un autre site pourrait faire soumettre un formulaire par le
//    navigateur de la personne connectée, dont le cookie partirait avec. La
//    session étant `SameSite=Lax`, une soumission depuis un autre site n'emporte
//    pas le cookie — mais on ne s'appuie pas sur un seul rempart : toute écriture
//    exige en plus une origine qui corresponde à l'hôte servi.
//
// 2. **La double soumission.** Un double clic, un rechargement, une connexion
//    lente : deux requêtes partent, deux issues sont créées dans cairn-wms. Une
//    écriture dupliquée n'est pas rattrapable depuis le dashboard, qui n'a le
//    droit ni de modifier ni de fermer. On retient donc chaque écriture par un
//    jeton d'intention, et la seconde tentative rend le résultat de la première.

/** Forme attendue d'un jeton d'intention : un identifiant aléatoire, rien d'autre. */
const JETON = /^[a-f0-9-]{16,64}$/i

/**
 * Vrai si la requête vient bien du dashboard lui-même.
 *
 * L'origine absente est refusée : les navigateurs l'envoient sur toute
 * soumission, y compris de même origine. Son absence signale un client qui n'est
 * pas un navigateur, ou une requête forgée.
 */
export function origineAcceptable(origine: unknown, hote: unknown): boolean {
  const h = String(hote ?? '').trim()
  const o = String(origine ?? '').trim()
  if (h === '' || o === '') return false

  try {
    return new URL(o).host === h
  }
  catch {
    return false
  }
}

/** Vrai si le jeton d'intention a une forme plausible. */
export function jetonAcceptable(jeton: unknown): boolean {
  return JETON.test(String(jeton ?? ''))
}

export interface AntiDoublon<T> {
  /** Ce qui a déjà été fait sous ce jeton, s'il l'a été. */
  deja: (jeton: string) => T | undefined
  /** Retient le résultat d'une écriture réussie. */
  retenir: (jeton: string, resultat: T) => void
  taille: () => number
  vider: () => void
}

/** Durée pendant laquelle une intention reste connue. */
export const MEMOIRE_MS = 10 * 60_000

export function creerAntiDoublon<T>(
  dureeMs: number = MEMOIRE_MS,
  maintenant: () => number = () => Date.now(),
): AntiDoublon<T> {
  const vus = new Map<string, { resultat: T, quandMs: number }>()

  function purger() {
    const limite = maintenant() - dureeMs
    for (const [cle, valeur] of vus) {
      if (valeur.quandMs < limite) vus.delete(cle)
    }
  }

  return {
    deja(jeton) {
      purger()
      return vus.get(jeton)?.resultat
    },
    retenir(jeton, resultat) {
      purger()
      vus.set(jeton, { resultat, quandMs: maintenant() })
    },
    taille() {
      purger()
      return vus.size
    },
    vider() {
      vus.clear()
    },
  }
}
