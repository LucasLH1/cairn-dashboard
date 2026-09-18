// Contrôle du jeton GitHub pour /health (docs/deploiement.md §2, fiche 0003) :
// la sonde doit savoir dire non — 503 si le jeton est refusé.
import { adresseApi } from './adresses-github'

export type EtatGithub = 'ok' | 'non-configure' | 'refuse' | 'injoignable'

/** Traduit le code HTTP renvoyé par l'API GitHub, ou `null` en cas d'échec réseau. */
export function interpreterReponseGithub(code: number | null): EtatGithub {
  if (code === null) return 'injoignable'
  if (code === 401 || code === 403) return 'refuse'
  if (code >= 200 && code < 300) return 'ok'
  return 'injoignable'
}

export async function verifierJetonGithub(
  jeton: string,
  depot: string,
  delaiMs = 5000,
  api = adresseApi(),
): Promise<EtatGithub> {
  if (!jeton || !depot) return 'non-configure'

  try {
    const reponse = await fetch(`${api}/repos/${depot}`, {
      headers: {
        'accept': 'application/vnd.github+json',
        'authorization': `Bearer ${jeton}`,
        'user-agent': 'cairn-dashboard',
        'x-github-api-version': '2022-11-28',
      },
      signal: AbortSignal.timeout(delaiMs),
    })
    return interpreterReponseGithub(reponse.status)
  }
  catch {
    return 'injoignable'
  }
}
