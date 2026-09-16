// /version — le SHA inscrit dans l'image à sa construction (docs/deploiement.md §2).
export default defineEventHandler((event) => {
  const commit = process.env.APP_COMMIT || useRuntimeConfig().appCommit || 'inconnu'
  setResponseHeader(event, 'cache-control', 'no-store')
  return { commit }
})
