// Diffusion du fil en direct — tranche 5.
//
// Le registre des navigateurs connectés. Il vit en mémoire du serveur : une
// connexion n'a de sens que tant que le processus tourne, et un redéploiement
// la ferme — le navigateur se reconnecte, et recharge le fil par l'API.
//
// Ce module ne connaît ni GitHub ni la base : il transporte, c'est tout.

/** Ce qu'on attend d'une connexion, réduit à ce qu'on emploie. */
export interface Connexion {
  send: (donnees: string) => unknown
}

const connexions = new Set<Connexion>()

export function inscrire(connexion: Connexion): void {
  connexions.add(connexion)
}

export function retirer(connexion: Connexion): void {
  connexions.delete(connexion)
}

export function combien(): number {
  return connexions.size
}

/** Pour les tests : repart sans aucune connexion. */
export function viderConnexions(): void {
  connexions.clear()
}

/**
 * Envoie un message à tous les navigateurs connectés.
 *
 * Une connexion morte ne doit pas empêcher les autres de recevoir : l'échec est
 * avalé et la connexion retirée. Rend le nombre d'envois réussis.
 */
export function diffuser(message: unknown): number {
  const texte = JSON.stringify(message)
  let envoyes = 0

  for (const connexion of [...connexions]) {
    try {
      connexion.send(texte)
      envoyes += 1
    }
    catch {
      connexions.delete(connexion)
    }
  }

  return envoyes
}
