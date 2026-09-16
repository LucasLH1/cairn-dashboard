// Déconnexion : la session est effacée, le visiteur revient à l'écran de connexion.
// La redirection s'écrit sur la réponse en cours, pour conserver le cookie de
// session effacé par la fermeture.
export default defineEventHandler(async (event) => {
  await fermerSession(event)
  event.node.res.statusCode = 302
  event.node.res.setHeader('location', '/connexion')
  event.node.res.setHeader('cache-control', 'no-store')
  event.node.res.end()
})
