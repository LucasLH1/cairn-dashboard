// /health — 200 si les dépendances répondent et si l'application est utilisable,
// 503 sinon (docs/deploiement.md §2).
//
// Trois contrôles : le jeton GitHub (tranche 1a), la configuration de la
// connexion (tranche 1b) et, depuis la tranche 3, **une lecture réelle de
// contenu**. Les deux premiers ne suffisaient pas : un jeton peut être accepté
// sur la métadonnée du dépôt sans avoir le droit de lire un fichier. La sonde
// répondait alors 200 pendant que chaque écran affichait un refus, et il fallait
// un humain pour s'en apercevoir.
//
// Le coût en quota est maîtrisé : le verdict de lecture est retenu une minute et
// passe par le cache conditionnel, dont les revalidations en 304 ne consomment
// rien. La base SQLite s'ajoutera en tranche 5.
//
// La réponse est construite telle quelle plutôt que par les assistants h3 :
// Nuxt embarque sa propre copie de h3 pour le serveur, et les types des deux
// copies divergent.
export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const jeton = String(config.githubToken ?? '')
  const depot = String(config.githubRepo ?? '')
  const configure = Boolean(jeton && depot)

  const [github, lecture, connexion] = await Promise.all([
    verifierJetonGithub(config.githubToken, config.githubRepo),
    verifierLecture(
      () => creerClient(jeton, depot, BRANCHE).brut(TEMOIN),
      configure,
    ),
    Promise.resolve(etatConnexion(config)),
  ])

  const sain = github === 'ok' && lecture === 'ok' && connexion === 'ok'

  const corps = {
    status: sain ? 'ok' : 'degraded',
    checks: { github, lecture, connexion },
  }

  return new Response(JSON.stringify(corps), {
    status: sain ? 200 : 503,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
})
