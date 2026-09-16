// /health — 200 si les dépendances répondent et si l'application est utilisable,
// 503 sinon (docs/deploiement.md §2).
//
// Deux contrôles à ce jour : le jeton GitHub (tranche 1a) et la configuration de
// la connexion (tranche 1b). Une application où personne ne peut entrer est en
// ligne mais inutilisable : la sonde doit savoir dire non. La base SQLite s'y
// ajoutera en tranche 5.
//
// La réponse est construite telle quelle plutôt que par les assistants h3 :
// Nuxt embarque sa propre copie de h3 pour le serveur, et les types des deux
// copies divergent.
export default defineEventHandler(async () => {
  const config = useRuntimeConfig()

  const [github, connexion] = await Promise.all([
    verifierJetonGithub(config.githubToken, config.githubRepo),
    Promise.resolve(etatConnexion(config)),
  ])

  const sain = github === 'ok' && connexion === 'ok'

  const corps = {
    status: sain ? 'ok' : 'degraded',
    checks: { github, connexion },
  }

  return new Response(JSON.stringify(corps), {
    status: sain ? 200 : 503,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
})
