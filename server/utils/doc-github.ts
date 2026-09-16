// Lecture de la documentation de cairn-wms — tranche 2, cadrage §« Ce qu'il lit ».
//
// La source de vérité est le dépôt cairn-wms, sur sa branche `dev` : celle où la
// documentation s'écrit, et où écrira le connecteur MCP (tranche 7). Le dashboard
// ne recopie rien et ne conserve rien durablement : il relit, en demandant à
// GitHub le moins possible (voir `cache-github.ts`).
//
// L'accès passe par Octokit (fiche 0001). Le client est injectable pour que les
// tests éprouvent les cas d'échec sans toucher au réseau.
import { Octokit } from '@octokit/rest'
import { creerCache, estNonModifie, servir } from './cache-github'

/**
 * Ce qui peut empêcher la lecture elle-même : la configuration, GitHub, le
 * réseau. Ce sont les seules causes qu'une erreur de transport peut produire.
 */
export type EchecTransport = 'non-configure' | 'refuse' | 'quota' | 'absent' | 'injoignable'

/**
 * Tout ce qui peut mal tourner, du point de vue de celui qui consulte.
 *
 * `illisible` est à part, et c'est pourquoi les deux types sont distincts : la
 * lecture a réussi, mais le contenu reçu n'est pas ce qu'on attendait. C'est un
 * défaut de la source, jamais du transport — et l'issue #3 exige qu'il soit
 * signalé plutôt que comblé par un affichage vide.
 */
export type EchecDoc = EchecTransport | 'illisible'

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

export interface EntreeArbre {
  path: string
  type: string
  size?: number
}

export interface ClientDoc {
  /** Les chemins de tous les fichiers du dépôt, sur la branche demandée. */
  arbre: () => Promise<EntreeArbre[]>
  /** Le contenu brut d'un fichier de `docs/`, décodé. */
  fichier: (chemin: string) => Promise<string>
  /** Le contenu brut d'un fichier quelconque du dépôt, décodé. */
  brut: (chemin: string) => Promise<string>
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
export function interpreterErreur(erreur: unknown): EchecTransport {
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
export function organiserArbre(entrees: EntreeArbre[]): Groupe[] {
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

// Les caches vivent au niveau du module : ils sont partagés par toutes les
// requêtes du serveur, et disparaissent au redéploiement. Ils n'ont pas à être
// remis à zéro ailleurs qu'en test.
const cacheArbre = creerCache<EntreeArbre[]>()
const cacheContenu = creerCache<string>()

/** Pour les tests : repart d'un cache vide. */
export function viderCaches(): void {
  cacheArbre.vider()
  cacheContenu.vider()
}

function entete(etag: string | null): Record<string, string> {
  return etag ? { 'if-none-match': etag } : {}
}

/** Construit le client de lecture. `depot` a la forme `proprietaire/depot`. */
export function creerClient(jeton: string, depot: string, branche: string): ClientDoc {
  const [proprietaire, nom] = depot.split('/')
  const owner = proprietaire ?? ''
  const repo = nom ?? ''
  const octokit = new Octokit({ auth: jeton, userAgent: 'cairn-dashboard' })

  async function lireBrut(chemin: string): Promise<string> {
    const cle = `${depot}@${branche}:${chemin}`
    // Le générique est annoté : la branche « rien n'a changé » ne porte pas de
    // valeur, et l'inférence en conclurait que le cache peut contenir `undefined`.
    const { valeur } = await servir<string>(cacheContenu, cle, async (etag) => {
      try {
        const reponse = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: chemin,
          ref: branche,
          headers: entete(etag),
        })

        noter(`contenu:${chemin}`, reponse.status, reponse.headers)

        const donnees = reponse.data
        // Un dossier revient sous forme de tableau : ce n'est pas un document.
        if (Array.isArray(donnees) || donnees.type !== 'file' || !('content' in donnees)) {
          throw new ErreurDoc('absent', `${chemin} n'est pas un document`)
        }

        return {
          modifie: true as const,
          valeur: Buffer.from(donnees.content, 'base64').toString('utf8'),
          etag: String(reponse.headers.etag ?? '') || null,
        }
      }
      catch (erreur) {
        // Un 304 est un appel sortant comme un autre : il doit être noté, c'est
        // lui qu'on cherche à mesurer.
        const entetes = (erreur as { response?: { headers?: unknown } })?.response?.headers
        const statut = (erreur as { status?: number })?.status
        if (statut !== undefined) noter(`contenu:${chemin}`, statut, entetes)

        if (estNonModifie(erreur)) return { modifie: false as const }
        throw erreur
      }
    })
    return valeur
  }

  return {
    async arbre() {
      const cle = `${depot}@${branche}:arbre`
      const { valeur } = await servir<EntreeArbre[]>(cacheArbre, cle, async (etag) => {
        try {
          const reponse = await octokit.rest.git.getTree({
            owner,
            repo,
            tree_sha: branche,
            recursive: '1',
            headers: entete(etag),
          })

          noter('arbre', reponse.status, reponse.headers)

          return {
            modifie: true as const,
            valeur: reponse.data.tree.map(e => ({
              path: e.path ?? '',
              type: e.type ?? '',
              size: e.size,
            })),
            etag: String(reponse.headers.etag ?? '') || null,
          }
        }
        catch (erreur) {
          // Un 304 part bien sur le réseau : c'est justement lui qu'on mesure.
          const entetes = (erreur as { response?: { headers?: unknown } })?.response?.headers
          const statut = (erreur as { status?: number })?.status
          if (statut !== undefined) noter('arbre', statut, entetes)

          if (estNonModifie(erreur)) return { modifie: false as const }
          throw erreur
        }
      })
      return valeur
    },

    fichier: (chemin: string) => lireBrut(`${RACINE}/${chemin}`),
    brut: lireBrut,
  }
}
