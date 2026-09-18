// L'écriture dans la documentation de cairn-wms — la troisième et dernière
// écriture que le cadrage autorise (principe 2), celle du connecteur MCP.
//
// La limite est vérifiée **ici**, à chaque écriture, quelle que soit la
// formulation reçue de l'assistant :
//
//   - dans `docs/` de cairn-wms, et rien d'autre — un chemin qui en sort est
//     refusé avant tout appel ;
//   - sur la branche `dev` — jamais `main`, jamais une autre ;
//   - par un commit dont le message commence par `docs:` — le serveur le compose
//     lui-même à partir d'un résumé, il ne prend pas le message du client.
//
// L'écriture porte le `sha` du contenu lu : GitHub refuse alors une modification
// croisée (409) au lieu de l'écraser. Sans `sha`, seule une création est
// possible, et GitHub refuse si le fichier existe déjà (422).
import { Octokit } from '@octokit/rest'
import { adresseApi } from './adresses-github'
import { BRANCHE, cheminSur, RACINE } from './doc-github'
import { noter } from './journal-github'

/** Taille maximale d'un document écrit : au-delà, ce n'est plus de la documentation. */
export const TAILLE_MAXIMALE = 200_000

/** Longueur maximale du résumé qui devient le message du commit. */
export const RESUME_MAXIMUM = 72

export type RefusEcriture = 'chemin' | 'resume' | 'contenu-vide' | 'trop-gros'

export interface Ecriture {
  chemin: string
  contenu: string
  resume: string
  /** Le `sha` du contenu lu, pour une mise à jour. Absent pour une création. */
  sha: string | null
}

export type Verification = { ok: true, ecriture: Ecriture } | { ok: false, refus: RefusEcriture }

function texte(valeur: unknown): string {
  return valeur === undefined || valeur === null ? '' : String(valeur)
}

/** Vérifie une demande d'écriture, champ par champ, avant qu'une ligne parte. */
export function verifierEcriture(brut: { chemin?: unknown, contenu?: unknown, resume?: unknown, sha?: unknown }): Verification {
  const chemin = texte(brut.chemin).trim().replace(/^\/+/, '')
  if (!cheminSur(chemin) || chemin.startsWith(`${RACINE}/`)) return { ok: false, refus: 'chemin' }

  const resume = texte(brut.resume).trim().replace(/\s+/g, ' ')
  if (resume === '' || resume.length > RESUME_MAXIMUM || /^docs?\s*:/i.test(resume)) return { ok: false, refus: 'resume' }

  const contenu = texte(brut.contenu)
  if (contenu.trim() === '') return { ok: false, refus: 'contenu-vide' }
  if (Buffer.byteLength(contenu, 'utf8') > TAILLE_MAXIMALE) return { ok: false, refus: 'trop-gros' }

  const sha = texte(brut.sha).trim()
  if (sha !== '' && !/^[0-9a-f]{40}$/i.test(sha)) return { ok: false, refus: 'chemin' }

  return { ok: true, ecriture: { chemin, contenu, resume, sha: sha === '' ? null : sha } }
}

/** Le message du commit, composé ici : le préfixe n'est pas laissé au client. */
export function messageDeCommit(resume: string): string {
  return `docs: ${resume}`
}

export type EchecEcriture = 'refuse' | 'conflit' | 'existe-deja' | 'absent' | 'injoignable'

export interface ResultatEcriture {
  chemin: string
  sha: string
  commit: string
  url: string | null
}

/** Ce que ce module attend d'Octokit, et rien de plus — simulable dans les tests. */
export interface OctokitEcriture {
  rest: {
    repos: {
      getContent: (args: Record<string, unknown>) => Promise<{ status: number, headers: Record<string, unknown>, data: unknown }>
      createOrUpdateFileContents: (args: Record<string, unknown>) => Promise<{
        status: number
        headers: Record<string, unknown>
        data: { content?: { sha?: unknown, html_url?: unknown } | null, commit?: { sha?: unknown } }
      }>
    }
  }
}

export class ErreurEcriture extends Error {
  constructor(readonly echec: EchecEcriture, message: string) {
    super(message)
    this.name = 'ErreurEcriture'
  }
}

function interpreter(erreur: unknown): EchecEcriture {
  const code = (erreur as { status?: number })?.status
  if (code === 409) return 'conflit'
  if (code === 422) return 'existe-deja'
  if (code === 404) return 'absent'
  if (code === 401 || code === 403) return 'refuse'
  return 'injoignable'
}

/** Le contenu et le `sha` d'un document de `docs/`, lus sans cache : c'est ce `sha` que l'écriture porte. */
export async function lireDocumentBrut(
  jeton: string,
  depot: string,
  chemin: string,
  injecte?: OctokitEcriture,
): Promise<{ contenu: string, sha: string }> {
  if (!cheminSur(chemin)) throw new ErreurEcriture('absent', 'chemin hors de docs/')
  const [owner, repo] = depot.split('/') as [string, string]
  const octokit = injecte ?? (new Octokit({ auth: jeton, userAgent: 'cairn-dashboard', baseUrl: adresseApi() }) as unknown as OctokitEcriture)

  try {
    const reponse = await octokit.rest.repos.getContent({ owner, repo, path: `${RACINE}/${chemin}`, ref: BRANCHE })
    noter(`contenu:${chemin}`, reponse.status, reponse.headers)
    const d = reponse.data as { type?: unknown, content?: unknown, sha?: unknown }
    if (Array.isArray(reponse.data) || d.type !== 'file' || typeof d.content !== 'string' || typeof d.sha !== 'string') {
      throw new ErreurEcriture('absent', `${chemin} n'est pas un document`)
    }
    return { contenu: Buffer.from(d.content, 'base64').toString('utf8'), sha: d.sha }
  }
  catch (erreur) {
    if (erreur instanceof ErreurEcriture) throw erreur
    const statut = (erreur as { status?: number })?.status
    if (statut !== undefined) noter(`contenu:${chemin}`, statut, (erreur as { response?: { headers?: unknown } })?.response?.headers)
    throw new ErreurEcriture(interpreter(erreur), (erreur as Error).message)
  }
}

/** Écrit un document dans `docs/` de cairn-wms, sur `dev`, par un commit `docs:`. */
export async function ecrireDocument(
  jeton: string,
  depot: string,
  ecriture: Ecriture,
  injecte?: OctokitEcriture,
): Promise<ResultatEcriture> {
  const [owner, repo] = depot.split('/') as [string, string]
  const octokit = injecte ?? (new Octokit({ auth: jeton, userAgent: 'cairn-dashboard', baseUrl: adresseApi() }) as unknown as OctokitEcriture)

  try {
    const reponse = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: `${RACINE}/${ecriture.chemin}`,
      message: messageDeCommit(ecriture.resume),
      content: Buffer.from(ecriture.contenu, 'utf8').toString('base64'),
      branch: BRANCHE,
      ...(ecriture.sha === null ? {} : { sha: ecriture.sha }),
    })
    noter(`écriture:${ecriture.chemin}`, reponse.status, reponse.headers)
    return {
      chemin: ecriture.chemin,
      sha: String(reponse.data.content?.sha ?? ''),
      commit: String(reponse.data.commit?.sha ?? ''),
      url: reponse.data.content?.html_url ? String(reponse.data.content.html_url) : null,
    }
  }
  catch (erreur) {
    const statut = (erreur as { status?: number })?.status
    if (statut !== undefined) noter(`écriture:${ecriture.chemin}`, statut, (erreur as { response?: { headers?: unknown } })?.response?.headers)
    throw new ErreurEcriture(interpreter(erreur), (erreur as Error).message)
  }
}
