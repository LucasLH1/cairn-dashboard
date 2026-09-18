// Métadonnées du serveur d'autorisation (RFC 8414) — fiche 0011. Elles
// annoncent PKCE S256, les deux types de grant, un client public ; ni CIMD ni
// enregistrement dynamique.
export default defineEventHandler((event) => {
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true })
  setHeader(event, 'cache-control', 'public, max-age=300')
  return metadonneesAutorisation(url.origin)
})
