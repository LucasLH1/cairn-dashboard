// /health — 200 si les dépendances répondent, 503 sinon (docs/deploiement.md §2).
// Tranche 1a : seule dépendance, le jeton GitHub. La base SQLite s'y ajoutera
// en tranche 5.
//
// La réponse est construite telle quelle plutôt que par les assistants h3 :
// Nuxt embarque sa propre copie de h3 pour le serveur, et les types des deux
// copies divergent. Une réponse standard évite cette ambiguïté.
export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const github = await verifierJetonGithub(config.githubToken, config.githubRepo)

  const corps = {
    status: github === 'ok' ? 'ok' : 'degraded',
    checks: { github },
  }

  return new Response(JSON.stringify(corps), {
    status: github === 'ok' ? 200 : 503,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
})
