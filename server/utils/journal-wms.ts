// Le journal de cairn-wms — tranche 5.
//
// Le format est celui de **son** dépôt, relevé à la source (règle 1), et il
// n'est pas le nôtre : son en-tête porte `modules` là où le journal du dashboard
// porte `tranches`. On le lit tel qu'il est, on ne le traduit pas.
//
// Deux pièges, rencontrés en lisant le dossier réel :
//
//   - `journal/README.md` contient un bloc qui **ressemble** à un en-tête : c'est
//     un exemple de documentation. Le prendre pour une entrée afficherait une
//     session qui n'a jamais eu lieu ;
//   - une entrée porte un champ non prévu, `annulee_par` — une session annulée
//     par un commit. Les champs inattendus sont donc conservés, jamais écartés :
//     c'est cairn-wms qui décide de son format, pas nous.
import { parse } from 'yaml'

/** Dossier lu dans cairn-wms. */
export const RACINE = 'journal'

/** Champs que nous savons nommer. Tout le reste est conservé à part. */
export interface EntreeJournal {
  /** Nom du fichier, qui porte la date : `AAAA-MM-JJ-HHMM-sujet.md`. */
  fichier: string
  /** Sujet tiré du nom du fichier, à défaut de mieux. */
  sujet: string
  date: string | null
  objectif: string | null
  modules: string[]
  issues: number[]
  /** Ce que l'en-tête porte en plus, conservé tel quel. */
  autres: Record<string, unknown>
  /** Le Markdown, après l'en-tête. */
  corps: string
}

const NOM_ENTREE = /^(\d{4})-(\d{2})-(\d{2})-(\d{4})-([a-z0-9-]+)\.md$/i

/**
 * Vrai si ce nom de fichier est celui d'une entrée.
 *
 * Le nommage `AAAA-MM-JJ-HHMM-sujet.md` fait office de filtre : il écarte
 * `README.md` sans avoir à le nommer, et écartera de même tout document que
 * cairn-wms ajouterait au dossier.
 */
export function estUneEntree(nom: string): boolean {
  return NOM_ENTREE.test(nom)
}

function texte(valeur: unknown): string | null {
  if (valeur === undefined || valeur === null) return null
  const t = String(valeur).trim()
  return t === '' ? null : t
}

function listeDeTextes(valeur: unknown): string[] {
  if (!Array.isArray(valeur)) return []
  return valeur.map(v => String(v)).filter(v => v !== '')
}

function listeDEntiers(valeur: unknown): number[] {
  if (!Array.isArray(valeur)) return []
  return valeur.map(v => Number(v)).filter(n => Number.isInteger(n))
}

/** Sépare l'en-tête YAML du corps. Rend `null` comme en-tête s'il n'y en a pas. */
function decouper(source: string): { entete: string | null, corps: string } {
  if (!source.startsWith('---')) return { entete: null, corps: source }

  const fin = source.indexOf('\n---', 3)
  if (fin === -1) return { entete: null, corps: source }

  const entete = source.slice(source.indexOf('\n') + 1, fin)
  // Le corps commence à son premier caractère utile : les sauts de ligne qui
  // séparent l'en-tête du texte ne font pas partie du document.
  return { entete, corps: source.slice(fin + 4).replace(/^\n+/, '') }
}

/**
 * Analyse une entrée.
 *
 * Un en-tête illisible ne fait pas échouer la lecture : l'entrée reste
 * affichable par son nom de fichier et son corps. Une entrée du journal vaut
 * mieux qu'un écran d'erreur, et le défaut se voit — les champs sont vides.
 */
export function analyserEntree(source: string, fichier: string): EntreeJournal {
  const correspondance = NOM_ENTREE.exec(fichier)
  const sujet = (correspondance?.[5] ?? fichier.replace(/\.md$/i, '')).replace(/-/g, ' ')

  const { entete, corps } = decouper(source)

  let brut: Record<string, unknown> = {}
  if (entete !== null) {
    try {
      const lu = parse(entete)
      if (typeof lu === 'object' && lu !== null && !Array.isArray(lu)) {
        brut = lu as Record<string, unknown>
      }
    }
    catch {
      brut = {}
    }
  }

  const { date, objectif, modules, issues, ...autres } = brut

  return {
    fichier,
    sujet,
    // À défaut d'un champ `date`, le nom du fichier en porte une.
    date: texte(date) ?? (correspondance
      ? `${correspondance[1]}-${correspondance[2]}-${correspondance[3]} ${correspondance[4]?.slice(0, 2)}:${correspondance[4]?.slice(2)}`
      : null),
    objectif: texte(objectif),
    modules: listeDeTextes(modules),
    issues: listeDEntiers(issues),
    autres,
    corps,
  }
}

/** Les entrées, de la plus récente à la plus ancienne. Le nom porte la date. */
export function trier(entrees: EntreeJournal[]): EntreeJournal[] {
  return [...entrees].sort((a, b) => b.fichier.localeCompare(a.fichier, 'fr'))
}

export interface FiltresJournal {
  module?: string | null
  issue?: number | null
}

/** Retrouve les sessions par module ou par issue, comme l'issue #5 le demande. */
export function filtrer(entrees: EntreeJournal[], filtres: FiltresJournal): EntreeJournal[] {
  return entrees.filter((e) => {
    if (filtres.module && !e.modules.includes(filtres.module)) return false
    if (filtres.issue !== null && filtres.issue !== undefined && !e.issues.includes(filtres.issue)) return false
    return true
  })
}

/** Les modules et les issues cités par l'ensemble des entrées, pour proposer des filtres réels. */
export function citations(entrees: EntreeJournal[]): { modules: string[], issues: number[] } {
  const modules = new Set<string>()
  const issues = new Set<number>()

  for (const e of entrees) {
    for (const m of e.modules) modules.add(m)
    for (const i of e.issues) issues.add(i)
  }

  return {
    modules: [...modules].sort((a, b) => a.localeCompare(b, 'fr')),
    issues: [...issues].sort((a, b) => a - b),
  }
}
