// Session scellée dans un cookie, par la session intégrée au serveur de Nuxt :
// aucune dépendance supplémentaire, et rien n'est conservé côté serveur.

export interface SessionUtilisateur {
  id?: number
  login?: string
}

function configuration() {
  const config = useRuntimeConfig()
  return {
    password: config.sessionPassword,
    name: 'cairn_session',
    maxAge: 60 * 60 * 12,
    cookie: {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    },
  }
}

export async function lireSession(event: Parameters<typeof useSession>[0]) {
  const config = useRuntimeConfig()
  // Sans secret de scellement, aucune session ne peut exister : porte fermée.
  if (!config.sessionPassword || config.sessionPassword.length < 32) return null
  const session = await useSession<SessionUtilisateur>(event, configuration())
  return session.data?.id ? session.data : null
}

export async function ouvrirSession(
  event: Parameters<typeof useSession>[0],
  utilisateur: { id: number, login: string },
) {
  const session = await useSession<SessionUtilisateur>(event, configuration())
  await session.update(utilisateur)
}

export async function fermerSession(event: Parameters<typeof useSession>[0]) {
  const session = await useSession<SessionUtilisateur>(event, configuration())
  await session.clear()
}
