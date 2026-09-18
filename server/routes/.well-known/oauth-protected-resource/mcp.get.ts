// La variante suffixée du chemin du serveur MCP (RFC 9728 §3.1) : Claude
// l'essaie en premier quand l'URL du serveur porte un chemin.
export default defineEventHandler((event) => {
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true })
  setHeader(event, 'cache-control', 'public, max-age=300')
  return metadonneesRessource(url.origin)
})
