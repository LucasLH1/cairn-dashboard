// L'organisation de cairn-wms, telle qu'elle existe — tranche 4.
//
// Un ticket créé depuis le dashboard doit respecter la manière dont cairn-wms
// range son travail : une nature, un module, et — déduits du module — le label
// de sa couche et le jalon de cette couche. Sans cela, le dashboard créerait des
// tickets orphelins que personne ne retrouverait dans les jalons.
//
// Tout ce qui suit s'appuie sur des correspondances **vérifiées à la source**
// (règle 1), et non supposées :
//
//   - la relation module → couche n'existe ni dans les labels ni dans les
//     issues : elle vit dans le `status.yml` de cairn-wms, seul à la porter ;
//   - le label d'une couche est celui qui commence par `couche/<id>-`, et celui
//     d'un module par `module/<id>-` — relevé sur les 6 couches et les 21
//     modules, sans manquant ni ambiguïté ;
//   - le jalon d'une couche est celui dont le **titre** est exactement le champ
//     `jalon` du fichier de suivi. Les six jalons du dépôt correspondent un à un.
import type { Avancement } from './avancement'

/** Les natures proposées à la création. `accessibility` existe mais ne se choisit pas ici. */
export const NATURES = ['spec', 'tech', 'bug'] as const
export type Nature = typeof NATURES[number]

export interface ModuleOrganise {
  id: string
  nom: string
  label: string
}

export interface CoucheOrganisee {
  id: string
  nom: string
  label: string | null
  jalon: string | null
  jalonNumero: number | null
  modules: ModuleOrganise[]
}

export interface Organisation {
  couches: CoucheOrganisee[]
  natures: Nature[]
}

export interface Jalon {
  numero: number
  titre: string
}

/** Ce qui sera réellement posé sur le ticket. */
export interface Deduction {
  labels: string[]
  jalon: string | null
  jalonNumero: number | null
}

function labelPour(prefixe: string, identifiant: string, labels: string[]): string | null {
  const candidats = labels.filter(l => l.startsWith(`${prefixe}/${identifiant}-`))
  // Une correspondance ambiguë serait pire qu'aucune : on refuse de choisir.
  return candidats.length === 1 ? (candidats[0] ?? null) : null
}

/**
 * Croise le suivi, les labels et les jalons du dépôt.
 *
 * Ce qui ne se raccorde pas est laissé à `null` plutôt que deviné : un module
 * sans label ne pourra pas être choisi, et cela se verra.
 */
export function construireOrganisation(
  avancement: Avancement,
  labels: string[],
  jalons: Jalon[],
): Organisation {
  const parTitre = new Map(jalons.map(j => [j.titre, j.numero]))

  const couches = avancement.couches.map((couche) => {
    const jalon = couche.jalon
    return {
      id: couche.id,
      nom: couche.nom,
      label: labelPour('couche', couche.id, labels),
      jalon,
      jalonNumero: jalon === null ? null : (parTitre.get(jalon) ?? null),
      modules: couche.modules
        .map((m) => {
          const label = labelPour('module', m.id, labels)
          return label === null ? null : { id: m.id, nom: m.nom, label }
        })
        .filter((m): m is ModuleOrganise => m !== null),
    }
  })

  return {
    couches,
    natures: [...NATURES].filter(n => labels.includes(n)),
  }
}

/** La couche qui porte ce module, s'il existe. */
export function coucheDuModule(idModule: string, organisation: Organisation): CoucheOrganisee | null {
  return organisation.couches.find(c => c.modules.some(m => m.id === idModule)) ?? null
}

/**
 * Ce qui sera posé sur le ticket, à partir d'une nature et d'un module.
 *
 * Sans module, il n'y a ni couche ni jalon à déduire : le ticket ne porte que sa
 * nature. C'est le cas « aucun module », qui reste légitime.
 */
export function deduire(
  nature: Nature,
  idModule: string | null,
  organisation: Organisation,
): Deduction | null {
  if (!organisation.natures.includes(nature)) return null

  if (idModule === null) {
    return { labels: [nature], jalon: null, jalonNumero: null }
  }

  const couche = coucheDuModule(idModule, organisation)
  if (couche === null) return null

  const module = couche.modules.find(m => m.id === idModule)
  if (!module || couche.label === null) return null

  return {
    labels: [nature, couche.label, module.label],
    jalon: couche.jalon,
    jalonNumero: couche.jalonNumero,
  }
}

export type RefusCoherence =
  | 'nature-inconnue'
  | 'module-inconnu'
  | 'labels-incoherents'
  | 'jalon-incoherent'

export type Coherence =
  | { ok: true, deduction: Deduction }
  | { ok: false, refus: RefusCoherence, detail?: string }

function memesElements(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const trie = (l: string[]) => [...l].sort()
  return trie(a).every((valeur, i) => valeur === trie(b)[i])
}

/**
 * Recalcule la déduction et la compare à celle annoncée par l'écran.
 *
 * On ne se contente pas de recalculer en silence : si l'écran a annoncé autre
 * chose que ce que le serveur déduit, quelque chose ne va pas — une version
 * désynchronisée, une requête forgée — et il vaut mieux refuser que poser des
 * labels que personne n'a vus dans l'aperçu.
 */
export function verifierCoherence(
  demande: { nature?: unknown, module?: unknown, labels?: unknown, jalonNumero?: unknown },
  organisation: Organisation,
): Coherence {
  const nature = String(demande.nature ?? '') as Nature
  if (!organisation.natures.includes(nature)) {
    return { ok: false, refus: 'nature-inconnue', detail: String(demande.nature ?? '') }
  }

  const brut = demande.module === null || demande.module === undefined ? null : String(demande.module)
  const idModule = brut === '' ? null : brut

  const deduction = deduire(nature, idModule, organisation)
  if (deduction === null) {
    return { ok: false, refus: 'module-inconnu', detail: idModule ?? '' }
  }

  // L'écran a le droit de ne rien annoncer ; s'il annonce, cela doit concorder.
  if (demande.labels !== undefined) {
    const annonces = Array.isArray(demande.labels) ? demande.labels.map(String) : []
    if (!memesElements(annonces, deduction.labels)) {
      return { ok: false, refus: 'labels-incoherents', detail: annonces.join(', ') }
    }
  }

  if (demande.jalonNumero !== undefined && demande.jalonNumero !== null) {
    if (Number(demande.jalonNumero) !== deduction.jalonNumero) {
      return { ok: false, refus: 'jalon-incoherent', detail: String(demande.jalonNumero) }
    }
  }

  return { ok: true, deduction }
}

export const REFUS_COHERENCE: Record<RefusCoherence, string> = {
  'nature-inconnue': 'Cette nature n\'existe pas dans cairn-wms. Choisissez parmi celles proposées.',
  'module-inconnu': 'Ce module n\'existe pas dans le suivi de cairn-wms.',
  'labels-incoherents': 'Les labels annoncés ne correspondent pas au module choisi. Rechargez la page et recommencez.',
  'jalon-incoherent': 'Le jalon annoncé ne correspond pas à la couche du module. Rechargez la page et recommencez.',
}
