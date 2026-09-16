// Session scellée dans un cookie, par la session intégrée au serveur de Nuxt :
// aucune dépendance supplémentaire, et rien n'est conservé côté serveur.
//
// Le sceau prouve que la session vient bien de ce serveur, rien de plus :
// l'identifiant qu'elle porte est revérifié à chaque requête, car le compte
// autorisé peut changer, et une session ancienne ne doit pas survivre à ce
// changement (cadrage, principe 4).

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

/** Session telle qu'elle est scellée, sans jugement sur le compte qu'elle porte. */
export async function lireSession(event: Parameters<typeof useSession>[0]) {
  const config = useRuntimeConfig()
  // Sans secret de scellement, aucune session ne peut exister : porte fermée.
  if (!config.sessionPassword || config.sessionPassword.length < 32) return null
  const session = await useSession<SessionUtilisateur>(event, configuration())
  return session.data?.id ? session.data : null
}

/**
 * Session d'un compte effectivement autorisé, ici et maintenant.
 * Un sceau valide ne suffit pas : l'identifiant est comparé à chaque requête.
 */
export async function lireSessionAutorisee(event: Parameters<typeof useSession>[0]) {
  const session = await lireSession(event)
  if (!session) return null
  const config = useRuntimeConfig()
  if (!estAutorise(session.id, config.allowedGithubId)) return null
  return session
}

export async function ouvrirSession(
  event: Parameters<typeof useSession>[0],
  utilisateur: { id: number, login: string },
) {
  const session = await useSession<SessionUtilisateur>(event, configuration())
  await session.update(utilisateur)
}

export async function fermerSession(event: Parameters<typeof useSession>[0]) {
  const config = useRuntimeConfig()
  if (!config.sessionPassword || config.sessionPassword.length < 32) return
  const session = await useSession<SessionUtilisateur>(event, configuration())
  await session.clear()
}
