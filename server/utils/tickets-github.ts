// Accès aux tickets de cairn-wms — tranche 4.
//
// Lecture des issues et des labels, et **création** : la première écriture du
// dashboard, l'une des trois que le cadrage autorise. Ni modification, ni
// fermeture, ni commentaire — ces routes n'existent pas, et ne doivent pas
// exister sans une fiche qui les acte.
//
// Le client est injectable : les tests éprouvent la création sans écrire dans
// cairn-wms, et sans dépôt d'essai à nettoyer.
import { Octokit } from '@octokit/rest'
import { creerCache, estNonModifie, servir } from './cache-github'
import { noter } from './journal-github'
import { depuisIssue, estUneIssue } from './tickets'
import type { Brouillon, Ticket } from './tickets'

/** Ce que le dashboard sait faire des tickets. Rien de plus. */
export interface ClientTickets {
  labels: () => Promise<string[]>
  tickets: () => Promise<Ticket[]>
  creer: (brouillon: Brouillon) => Promise<{ numero: number, url: string }>
}

const cacheLabels = creerCache<string[]>()
const cacheTickets = creerCache<Ticket[]>()

/** Pour les tests, et après chaque création. */
export function viderCachesTickets(): void {
  cacheLabels.vider()
  cacheTickets.vider()
}

/**
 * Oublie la liste d'un dépôt.
 *
 * Appelé après une création réussie : sans cela, le ticket qu'on vient d'écrire
 * resterait invisible jusqu'à trente secondes, et la personne croirait à un
 * échec — puis recommencerait.
 */
export function invaliderListe(depot: string): void {
  cacheTickets.oublier(`${depot}:tickets`)
}

function entete(etag: string | null): Record<string, string> {
  return etag ? { 'if-none-match': etag } : {}
}

/** Une réponse de l'API, réduite à ce que ce module emploie. */
export interface ReponseGithub<T> {
  status: number
  headers: Record<string, unknown>
  data: T
}

/**
 * Ce que ce module attend d'Octokit, et rien de plus.
 *
 * Réduire la surface permet de simuler GitHub dans les tests : la création est
 * ainsi éprouvée **sans écrire une seule issue dans cairn-wms**, et sans dépôt
 * d'essai à nettoyer ensuite.
 */
export interface OctokitTickets {
  rest: {
    issues: {
      listLabelsForRepo: (args: Record<string, unknown>) => Promise<ReponseGithub<Array<{ name?: unknown }>>>
      listForRepo: (args: Record<string, unknown>) => Promise<ReponseGithub<unknown[]>>
      create: (args: Record<string, unknown>) => Promise<ReponseGithub<{ number: unknown, html_url: unknown }>>
    }
  }
}

export function creerClientTickets(
  jeton: string,
  depot: string,
  injecte?: OctokitTickets,
): ClientTickets {
  const [proprietaire, nom] = depot.split('/')
  const owner = proprietaire ?? ''
  const repo = nom ?? ''
  // Les types d'Octokit sont plus riches que ceux dont ce module a besoin :
  // la conversion dit qu'on n'en emploie qu'une part.
  const octokit = injecte
    ?? (new Octokit({ auth: jeton, userAgent: 'cairn-dashboard' }) as unknown as OctokitTickets)

  return {
    async labels() {
      const { valeur } = await servir<string[]>(cacheLabels, `${depot}:labels`, async (etag) => {
        try {
          const reponse = await octokit.rest.issues.listLabelsForRepo({
            owner,
            repo,
            per_page: 100,
            headers: entete(etag),
          })
          noter('labels', reponse.status, reponse.headers)
          return {
            modifie: true as const,
            valeur: reponse.data.map(l => String(l.name)),
            etag: String(reponse.headers.etag ?? '') || null,
          }
        }
        catch (erreur) {
          const statut = (erreur as { status?: number })?.status
          if (statut !== undefined) {
            noter('labels', statut, (erreur as { response?: { headers?: unknown } })?.response?.headers)
          }
          if (estNonModifie(erreur)) return { modifie: false as const }
          throw erreur
        }
      })
      return valeur
    },

    async tickets() {
      const { valeur } = await servir<Ticket[]>(cacheTickets, `${depot}:tickets`, async (etag) => {
        try {
          // Tous les états : le filtrage se fait ensuite, sans rappeler GitHub.
          const reponse = await octokit.rest.issues.listForRepo({
            owner,
            repo,
            state: 'all',
            per_page: 100,
            sort: 'created',
            direction: 'desc',
            headers: entete(etag),
          })
          noter('tickets', reponse.status, reponse.headers)
          return {
            modifie: true as const,
            valeur: reponse.data.filter(estUneIssue).map(depuisIssue),
            etag: String(reponse.headers.etag ?? '') || null,
          }
        }
        catch (erreur) {
          const statut = (erreur as { status?: number })?.status
          if (statut !== undefined) {
            noter('tickets', statut, (erreur as { response?: { headers?: unknown } })?.response?.headers)
          }
          if (estNonModifie(erreur)) return { modifie: false as const }
          throw erreur
        }
      })
      return valeur
    },

    async creer(brouillon: Brouillon) {
      const reponse = await octokit.rest.issues.create({
        owner,
        repo,
        title: brouillon.titre,
        ...(brouillon.corps === '' ? {} : { body: brouillon.corps }),
        ...(brouillon.labels.length === 0 ? {} : { labels: brouillon.labels }),
      })

      noter('création', reponse.status, reponse.headers)

      // La liste doit refléter immédiatement ce qui vient d'être écrit.
      invaliderListe(depot)

      return { numero: Number(reponse.data.number), url: String(reponse.data.html_url) }
    },
  }
}
