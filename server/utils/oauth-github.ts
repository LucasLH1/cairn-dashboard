// Connexion GitHub — tranche 1b.
// L'accès est réservé à un seul compte, reconnu par son identifiant numérique :
// un login peut être renommé puis repris par un autre compte (cadrage, principe 4).
//
// Les échanges avec GitHub reçoivent leur fonction de requête en paramètre :
// les tests les éprouvent avec un fournisseur simulé, sans identifiants réels.
import { adresseApi, adresseWeb } from './adresses-github'

export type Requeteur = typeof globalThis.fetch

export interface UtilisateurGithub {
  id: number
  login: string
}

/** Vrai seulement si l'identifiant correspond exactement au compte autorisé. */
export function estAutorise(id: unknown, idAutorise: string): boolean {
  const attendu = String(idAutorise ?? '').trim()
  // Sans compte autorisé configuré, personne n'entre : la porte reste fermée.
  if (!/^\d+$/.test(attendu)) return false
  if (typeof id !== 'number' || !Number.isInteger(id)) return false
  return String(id) === attendu
}

export function urlAutorisation(clientId: string, urlRappel: string, etat: string, web = adresseWeb()): string {
  const parametres = new URLSearchParams({
    client_id: clientId,
    redirect_uri: urlRappel,
    state: etat,
    // Aucune portée demandée : l'identité publique suffit à reconnaître le compte.
    scope: '',
    allow_signup: 'false',
  })
  return `${web}/login/oauth/authorize?${parametres}`
}

/** Échange le code reçu contre un jeton d'accès. Renvoie null si GitHub refuse. */
export async function echangerCode(
  requeteur: Requeteur,
  options: { clientId: string, clientSecret: string, code: string, urlRappel: string },
  web = adresseWeb(),
): Promise<string | null> {
  try {
    const reponse = await requeteur(`${web}/login/oauth/access_token`, {
      method: 'POST',
      headers: { 'accept': 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: options.clientId,
        client_secret: options.clientSecret,
        code: options.code,
        redirect_uri: options.urlRappel,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!reponse.ok) return null
    const corps = await reponse.json() as { access_token?: string }
    return corps.access_token ?? null
  }
  catch {
    return null
  }
}

/** Lit l'identité publique du porteur du jeton. Renvoie null si GitHub refuse. */
export async function lireUtilisateur(
  requeteur: Requeteur,
  jeton: string,
  api = adresseApi(),
): Promise<UtilisateurGithub | null> {
  try {
    const reponse = await requeteur(`${api}/user`, {
      headers: {
        'accept': 'application/vnd.github+json',
        'authorization': `Bearer ${jeton}`,
        'user-agent': 'cairn-dashboard',
        'x-github-api-version': '2022-11-28',
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (!reponse.ok) return null
    const corps = await reponse.json() as { id?: unknown, login?: unknown }
    if (typeof corps.id !== 'number' || typeof corps.login !== 'string') return null
    return { id: corps.id, login: corps.login }
  }
  catch {
    return null
  }
}
