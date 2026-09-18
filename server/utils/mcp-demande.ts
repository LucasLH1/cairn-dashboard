// La demande d'autorisation en attente de consentement — fiche 0011.
//
// Entre l'arrivée de Claude sur `/oauth/autoriser` et le clic de la personne
// sur l'écran de consentement, la demande vit dans un cookie scellé, dix
// minutes, par la session intégrée au serveur — la même brique que la session
// de connexion, avec son propre nom. Rien n'est conservé côté serveur.
import type { DemandeAutorisation } from './mcp-oauth'

type Evenement = Parameters<typeof useSession>[0]

const NOM = 'cairn_mcp_demande'
const DUREE_S = 600

function configuration(password: string) {
  return {
    password,
    name: NOM,
    maxAge: DUREE_S,
    cookie: {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    },
  }
}

interface Attente {
  demande?: DemandeAutorisation
  deposeeLe?: number
}

export async function deposerDemande(event: Evenement, demande: DemandeAutorisation): Promise<void> {
  const config = useRuntimeConfig()
  const session = await useSession<Attente>(event, configuration(String(config.sessionPassword)))
  await session.update({ demande, deposeeLe: Date.now() })
}

/** La demande en attente, ou nul s'il n'y en a pas — ou si elle a plus de dix minutes. */
export async function lireDemande(event: Evenement): Promise<DemandeAutorisation | null> {
  const config = useRuntimeConfig()
  const password = String(config.sessionPassword ?? '')
  if (password.length < 32) return null
  const session = await useSession<Attente>(event, configuration(password))
  const attente = session.data
  if (!attente?.demande || !attente.deposeeLe) return null
  if (Date.now() - attente.deposeeLe > DUREE_S * 1000) return null
  return attente.demande
}

export async function effacerDemande(event: Evenement): Promise<void> {
  const config = useRuntimeConfig()
  const password = String(config.sessionPassword ?? '')
  if (password.length < 32) return
  const session = await useSession<Attente>(event, configuration(password))
  await session.clear()
}
