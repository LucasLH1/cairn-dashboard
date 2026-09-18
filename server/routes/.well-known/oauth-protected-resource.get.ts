// Métadonnées de ressource protégée (RFC 9728) — fiche 0011. Le serveur MCP
// dit ici qui délivre ses jetons : le dashboard lui-même. Dérivées de
// l'origine servie, jamais écrites en dur.
export default defineEventHandler((event) => {
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true })
  setHeader(event, 'cache-control', 'public, max-age=300')
  return metadonneesRessource(url.origin)
})
