// Lecture de la documentation de cairn-wms — tranche 2, cadrage §« Ce qu'il lit ».
//
// La source de vérité est le dépôt cairn-wms, sur sa branche `dev` : celle où la
// documentation s'écrit, et où écrira le connecteur MCP (tranche 7). Le dashboard
// ne recopie rien et ne conserve rien : il lit à chaque affichage.
//
// L'accès passe par Octokit (fiche 0001). Le client est injectable pour que les
// tests éprouvent les cas d'échec sans toucher au réseau.
import { Octokit } from '@octokit/rest'

/** Ce qui peut mal tourner, du point de vue de celui qui consulte. */
export type EchecDoc = 'non-configure' | 'refuse' | 'quota' | 'absent' | 'injoignable'

/** Dossier lu dans cairn-wms. Le cadrage n'autorise que celui-là. */
export const RACINE = 'docs'

/**
 * Branche lue : `dev`, celle où la documentation s'écrit dans cairn-wms — et où
 * écrira le connecteur MCP de la tranche 7. Jamais `main`, qui peut être en
 * retard sur ce qui est en cours de rédaction.
 */
export const BRANCHE = 'dev'

export interface Document {
  /** Chemin relatif à `docs/`, par exemple `socle/0.1-organisation.md`. */
  chemin: string
  /** Nom affiché : celui du fichier, sans son extension. On n'invente pas de titre. */
  nom: string
  taille: number
}

export interface Groupe {
  /** Dossier relatif à `docs/`, ou `null` pour les documents de la racine. */
  dossier: string | null
  documents: Document[]
}

export interface ClientDoc {
  /** Les chemins de tous les fichiers du dépôt, sur la branche demandée. */
  arbre: () => Promise<Array<{ path: string, type: string, size?: number }>>
  /** Le contenu brut d'un fichier, décodé. */
  fichier: (chemin: string) => Promise<string>
}

export class ErreurDoc extends Error {
  constructor(readonly echec: EchecDoc, message: string) {
    super(message)
    this.name = 'ErreurDoc'
  }
}

/**
 * Traduit une erreur d'Octokit en cause compréhensible.
 *
 * Les codes proviennent de l'API réelle, éprouvée : 401 « Bad credentials »,
 * 404 « Not Found » pour un fichier absent comme pour une branche inconnue, et
 * 403 qui recouvre deux cas très différents — quota épuisé ou accès refusé.
 * Seul l'en-tête du quota permet de les distinguer.
 */
export function interpreterErreur(erreur: unknown): EchecDoc {
  const e = erreur as { status?: number, response?: { headers?: Record<string, string> } }
  const code = e?.status

  if (code === undefined) return 'injoignable'
  if (code === 401) return 'refuse'

  if (code === 403 || code === 429) {
    const restant = e?.response?.headers?.['x-ratelimit-remaining']
    return restant === '0' ? 'quota' : 'refuse'
  }

  if (code === 404) return 'absent'
  return 'injoignable'
}

/** Le nom affiché d'un document : son nom de fichier, sans extension. */
export function nomDepuisChemin(chemin: string): string {
  const fichier = chemin.slice(chemin.lastIndexOf('/') + 1)
  return fichier.replace(/\.md$/i, '')
}

/**
 * Range les chemins lus en groupes affichables : la racine d'abord, puis les
 * dossiers par ordre alphabétique, et les documents de même au sein de chacun.
 */
export function organiserArbre(
  entrees: Array<{ path: string, type: string, size?: number }>,
): Groupe[] {
  const documents = entrees
    .filter(e => e.type === 'blob')
    .filter(e => e.path.startsWith(`${RACINE}/`))
    .filter(e => e.path.toLowerCase().endsWith('.md'))
    .map(e => ({
      chemin: e.path.slice(RACINE.length + 1),
      taille: e.size ?? 0,
    }))

  const parDossier = new Map<string, Document[]>()

  for (const doc of documents) {
    const coupe = doc.chemin.lastIndexOf('/')
    const dossier = coupe === -1 ? '' : doc.chemin.slice(0, coupe)
    const liste = parDossier.get(dossier) ?? []
    liste.push({ chemin: doc.chemin, nom: nomDepuisChemin(doc.chemin), taille: doc.taille })
    parDossier.set(dossier, liste)
  }

  const dossiers = [...parDossier.keys()].sort((a, b) => {
    if (a === '') return -1
    if (b === '') return 1
    return a.localeCompare(b, 'fr')
  })

  return dossiers.map(dossier => ({
    dossier: dossier === '' ? null : dossier,
    documents: (parDossier.get(dossier) ?? []).sort((a, b) => a.chemin.localeCompare(b.chemin, 'fr')),
  }))
}

/** Vrai si le chemin demandé reste dans `docs/` : aucune remontée, aucun détour. */
export function cheminSur(chemin: string): boolean {
  if (!chemin || chemin.startsWith('/')) return false
  if (chemin.includes('..')) return false
  if (chemin.includes('\\')) return false
  if (chemin.includes('\0')) return false
  return /\.md$/i.test(chemin)
}

/** Construit le client de lecture. `depot` a la forme `proprietaire/depot`. */
export function creerClient(jeton: string, depot: string, branche: string): ClientDoc {
  const [proprietaire, nom] = depot.split('/')
  const octokit = new Octokit({ auth: jeton, userAgent: 'cairn-dashboard' })

  return {
    async arbre() {
      const reponse = await octokit.rest.git.getTree({
        owner: proprietaire ?? '',
        repo: nom ?? '',
        tree_sha: branche,
        recursive: '1',
      })
      return reponse.data.tree.map(e => ({
        path: e.path ?? '',
        type: e.type ?? '',
        size: e.size,
      }))
    },

    async fichier(chemin: string) {
      const reponse = await octokit.rest.repos.getContent({
        owner: proprietaire ?? '',
        repo: nom ?? '',
        path: `${RACINE}/${chemin}`,
        ref: branche,
      })

      const donnees = reponse.data
      // Un dossier revient sous forme de tableau : ce n'est pas un document.
      if (Array.isArray(donnees) || donnees.type !== 'file' || !('content' in donnees)) {
        throw new ErreurDoc('absent', `${chemin} n'est pas un document`)
      }

      return Buffer.from(donnees.content, 'base64').toString('utf8')
    },
  }
}
