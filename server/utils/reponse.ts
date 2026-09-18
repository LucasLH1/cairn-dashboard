// Réponses écrites sur la réponse en cours — jamais renvoyées neuves.
//
// Une réponse neuve repartirait sans les en-têtes déjà posés, cookies compris :
// c'est le défaut qui avait rendu la connexion impossible au premier jet de la
// tranche 1b. Les parcours qui posent ou effacent un cookie puis redirigent
// passent donc par ici.
//
// L'événement est typé par ce que Nitro auto-importe : Nuxt embarque sa propre
// copie de h3 pour le serveur, et les types de la copie du poste divergent.
type Evenement = Parameters<typeof getRequestURL>[0]

export function rediriger(event: Evenement, cible: string): void {
  event.node.res.statusCode = 302
  event.node.res.setHeader('location', cible)
  event.node.res.setHeader('cache-control', 'no-store')
  event.node.res.end()
}

export function repondreJson(event: Evenement, statut: number, corps: unknown, entetes: Record<string, string> = {}): void {
  event.node.res.statusCode = statut
  event.node.res.setHeader('content-type', 'application/json; charset=utf-8')
  event.node.res.setHeader('cache-control', 'no-store')
  for (const [nom, valeur] of Object.entries(entetes)) event.node.res.setHeader(nom, valeur)
  event.node.res.end(JSON.stringify(corps))
}

export function repondreTexte(event: Evenement, statut: number, texte: string): void {
  event.node.res.statusCode = statut
  event.node.res.setHeader('content-type', 'text/plain; charset=utf-8')
  event.node.res.setHeader('cache-control', 'no-store')
  event.node.res.end(texte)
}
