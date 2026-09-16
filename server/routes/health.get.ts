// /health — 200 si les dépendances répondent et si l'application est utilisable,
// 503 sinon (docs/deploiement.md §2).
//
// Quatre contrôles : le jeton GitHub (tranche 1a), la configuration de la
// connexion (tranche 1b), une **lecture réelle de contenu** (tranche 3) et la
// **base** (tranche 5).
//
// La base est éprouvée en lecture **et en écriture** : un volume monté en
// lecture seule laisse lire, et ne se révélerait qu'au premier webhook perdu —
// c'est-à-dire trop tard, l'événement n'étant pas rejouable.
//
// `/live` ne dépend d'aucun de ces contrôles : le conteneur reste sain même
// quand le service ne l'est pas.
//
// La réponse est construite telle quelle plutôt que par les assistants h3 :
// Nuxt embarque sa propre copie de h3 pour le serveur, et les types des deux
// copies divergent.
export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const jeton = String(config.githubToken ?? '')
  const depot = String(config.githubRepo ?? '')
  const configure = Boolean(jeton && depot)

  let base: string
  try {
    base = verifierBase(obtenirBase(config))
  }
  catch {
    // La base ne s'ouvre même pas : dossier absent, droits manquants, fichier
    // corrompu. Le dire plutôt que de laisser la sonde échouer en erreur.
    base = 'inaccessible'
  }

  const [github, lecture, connexion] = await Promise.all([
    verifierJetonGithub(config.githubToken, config.githubRepo),
    verifierLecture(
      () => creerClient(jeton, depot, BRANCHE).brut(TEMOIN),
      configure,
    ),
    Promise.resolve(etatConnexion(config)),
  ])

  const sain = github === 'ok' && lecture === 'ok' && connexion === 'ok' && base === 'ok'

  const corps = {
    status: sain ? 'ok' : 'degraded',
    checks: { github, lecture, connexion, base },
  }

  return new Response(JSON.stringify(corps), {
    status: sain ? 200 : 503,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
})
