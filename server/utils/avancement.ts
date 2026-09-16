// Avancement de cairn-wms — tranche 3, cadrage §« Ce qu'il lit ».
//
// Le format lu est celui du `status.yml` réel de cairn-wms, relevé à la source
// (règle 1) : `couches` → `modules`, chaque module portant `id`, `nom`, `etat`,
// `issue`, `doc` — parfois nul — et `prefixe_regles`.
//
// **Le vocabulaire est celui de cairn-wms, pas le nôtre** : ses états ne sont pas
// ceux du dashboard, qui ignore `spécifié`. On les reprend tels quels, sans les
// traduire ni les ramener à nos propres états.
//
// Rien n'est deviné : un fichier illisible, une structure inattendue ou un état
// inconnu sont signalés, jamais comblés par une valeur par défaut (issue #3).
import { parse } from 'yaml'

/** Les états déclarés par l'en-tête du `status.yml` de cairn-wms. */
export const ETATS = ['à faire', 'spécifié', 'en développement', 'livré'] as const
export type EtatModule = typeof ETATS[number]

export interface Module {
  id: string
  nom: string
  /** L'état reconnu, ou `null` si cairn-wms en emploie un que nous ne connaissons pas. */
  etat: EtatModule | null
  /** Ce qui était écrit, toujours conservé — c'est ce qu'on affiche en cas d'inconnu. */
  etatBrut: string
  issue: number | null
  /** Chemin du document, relatif à `docs/`, prêt pour la tranche 2. `null` s'il n'y en a pas. */
  doc: string | null
  prefixeRegles: string | null
}

export interface Couche {
  id: string
  nom: string
  jalon: string | null
  modules: Module[]
}

export interface Avancement {
  projet: string | null
  misAJourLe: string | null
  couches: Couche[]
}

export class ErreurAvancement extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ErreurAvancement'
  }
}

function texteOuNul(valeur: unknown): string | null {
  if (valeur === undefined || valeur === null) return null
  const t = String(valeur).trim()
  return t === '' ? null : t
}

function entierOuNul(valeur: unknown): number | null {
  if (typeof valeur === 'number' && Number.isInteger(valeur)) return valeur
  const t = texteOuNul(valeur)
  if (t === null || !/^\d+$/.test(t)) return null
  return Number(t)
}

/**
 * Le chemin du document tel que la tranche 2 l'attend : relatif à `docs/`.
 * cairn-wms l'écrit depuis la racine du dépôt (`docs/socle/0.1-…`).
 */
export function cheminDocumentation(doc: unknown): string | null {
  const t = texteOuNul(doc)
  if (t === null) return null
  if (!t.startsWith('docs/')) return null
  const reste = t.slice('docs/'.length)
  return reste === '' ? null : reste
}

function lireModule(brut: unknown, ouAilleurs: string): Module {
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) {
    throw new ErreurAvancement(`module illisible dans ${ouAilleurs}`)
  }

  const m = brut as Record<string, unknown>
  const id = texteOuNul(m.id)
  const nom = texteOuNul(m.nom)

  if (id === null) throw new ErreurAvancement(`module sans identifiant dans ${ouAilleurs}`)
  if (nom === null) throw new ErreurAvancement(`module ${id} sans nom`)

  const etatBrut = texteOuNul(m.etat) ?? ''
  const connu = (ETATS as readonly string[]).includes(etatBrut)

  return {
    id,
    nom,
    etat: connu ? (etatBrut as EtatModule) : null,
    etatBrut,
    issue: entierOuNul(m.issue),
    doc: cheminDocumentation(m.doc),
    prefixeRegles: texteOuNul(m.prefixe_regles),
  }
}

/**
 * Analyse le `status.yml` de cairn-wms.
 *
 * Lève `ErreurAvancement` si le fichier n'est pas du YAML, ou si sa forme n'est
 * pas celle attendue. Un état inconnu, lui, ne fait pas échouer la lecture : il
 * est rendu tel quel, à charge pour l'écran de le signaler.
 */
export function analyserAvancement(source: string): Avancement {
  let racine: unknown

  try {
    racine = parse(source)
  }
  catch (erreur) {
    throw new ErreurAvancement(`le suivi de cairn-wms n'est pas lisible : ${(erreur as Error).message}`)
  }

  if (typeof racine !== 'object' || racine === null || Array.isArray(racine)) {
    throw new ErreurAvancement('le suivi de cairn-wms ne contient pas de table')
  }

  const r = racine as Record<string, unknown>

  if (!Array.isArray(r.couches)) {
    throw new ErreurAvancement('le suivi de cairn-wms ne déclare pas de couches')
  }

  const couches = r.couches.map((brut, rang) => {
    if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) {
      throw new ErreurAvancement(`couche illisible au rang ${rang + 1}`)
    }

    const c = brut as Record<string, unknown>
    const id = texteOuNul(c.id)
    const nom = texteOuNul(c.nom)

    if (id === null) throw new ErreurAvancement(`couche sans identifiant au rang ${rang + 1}`)
    if (nom === null) throw new ErreurAvancement(`couche ${id} sans nom`)
    if (!Array.isArray(c.modules)) throw new ErreurAvancement(`couche ${id} sans modules`)

    return {
      id,
      nom,
      jalon: texteOuNul(c.jalon),
      modules: c.modules.map(m => lireModule(m, `la couche ${id}`)),
    }
  })

  return {
    projet: texteOuNul(r.projet),
    misAJourLe: texteOuNul(r.mis_a_jour_le),
    couches,
  }
}

/** Combien de modules par état, pour la vue d'ensemble de la page d'accueil. */
export function compter(avancement: Avancement): {
  total: number
  parEtat: Record<string, number>
  inconnus: number
} {
  const parEtat: Record<string, number> = {}
  let total = 0
  let inconnus = 0

  for (const couche of avancement.couches) {
    for (const module of couche.modules) {
      total += 1
      if (module.etat === null) {
        inconnus += 1
        continue
      }
      parEtat[module.etat] = (parEtat[module.etat] ?? 0) + 1
    }
  }

  return { total, parEtat, inconnus }
}
