// Configuration de la connexion — tranche 1b.
//
// Une application qui démarre sans pouvoir ouvrir la moindre session n'est pas
// en bonne santé : elle est en ligne et inutilisable. /health doit donc le dire,
// sinon un déploiement se déclare bon alors que personne ne peut entrer — ce qui
// est arrivé le 2026-09-16, un secret de session tronqué à la saisie.
//
// Les valeurs sont converties en chaînes avant examen : Nuxt convertit les
// variables d'environnement selon leur contenu, si bien qu'un identifiant
// numérique arrive comme un nombre.

export type EtatConnexion =
  | 'ok'
  | 'secret-de-session-absent'
  | 'secret-de-session-trop-court'
  | 'identifiants-oauth-absents'
  | 'compte-autorise-absent'

/** Longueur minimale du secret de scellement, exigée par la bibliothèque. */
export const LONGUEUR_MINIMALE_SECRET = 32

function texte(valeur: unknown): string {
  return valeur === undefined || valeur === null ? '' : String(valeur)
}

export function etatConnexion(config: {
  sessionPassword?: unknown
  allowedGithubId?: unknown
  oauth?: { github?: { clientId?: unknown, clientSecret?: unknown } }
}): EtatConnexion {
  const secret = texte(config.sessionPassword)
  if (!secret) return 'secret-de-session-absent'
  if (secret.length < LONGUEUR_MINIMALE_SECRET) return 'secret-de-session-trop-court'

  if (!texte(config.oauth?.github?.clientId) || !texte(config.oauth?.github?.clientSecret)) {
    return 'identifiants-oauth-absents'
  }

  if (!/^\d+$/.test(texte(config.allowedGithubId).trim())) return 'compte-autorise-absent'

  return 'ok'
}
