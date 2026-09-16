// Rien n'est accessible sans connexion, hors la courte liste de server/utils/acces.ts
// (cadrage, principe 4).
//
// Le contrôle porte sur l'identifiant numérique du compte, **à chaque requête** :
// un sceau valide prouve seulement que la session vient de ce serveur. Une session
// d'un autre compte, même correctement scellée, est refusée et effacée.
//
// La réponse est écrite sur la réponse en cours plutôt que renvoyée neuve : une
// réponse neuve repartirait sans les en-têtes déjà posés — cookies compris.
export default defineEventHandler(async (event) => {
  const chemin = getRequestURL(event).pathname
  if (cheminPublic(chemin)) return

  const session = await lireSession(event)
  const config = useRuntimeConfig()

  if (session && estAutorise(session.id, config.allowedGithubId)) return

  // Session scellée mais d'un compte qui n'est plus — ou n'a jamais été — autorisé :
  // on l'efface, pour qu'elle ne revienne pas à chaque requête.
  if (session) await fermerSession(event)

  event.node.res.setHeader('cache-control', 'no-store')

  // Une requête de données répond franchement ; une page mène à la connexion.
  if (chemin.startsWith('/api/') || chemin.endsWith('.json')) {
    event.node.res.statusCode = 401
    event.node.res.setHeader('content-type', 'application/json; charset=utf-8')
    event.node.res.end(JSON.stringify({ message: 'Connexion requise' }))
    return
  }

  event.node.res.statusCode = 302
  event.node.res.setHeader('location', session ? '/refus' : '/connexion')
  event.node.res.end()
})
