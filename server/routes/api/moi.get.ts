// Identité de la session ouverte. Le middleware d'authentification a déjà
// écarté les requêtes sans session : ici, elle existe forcément.
export default defineEventHandler(async (event): Promise<{ login: string | null }> => {
  const session = await lireSession(event)
  return { login: session?.login ?? null }
})
