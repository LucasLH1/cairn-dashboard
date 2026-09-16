// Tickets de cairn-wms — tranche 4, cadrage §« Ce qu'il lit » et §« Ce qu'il écrit ».
//
// La création d'issues est **l'une des trois écritures** que le cadrage autorise,
// et elle n'en ouvre aucune autre : ni modification, ni fermeture, ni commentaire.
//
// Les filtres sont bâtis sur les labels réels de cairn-wms, relevés à la source
// (règle 1) : `couche/…` (6), `module/…` (21), et quatre labels sans préfixe qui
// disent la nature du travail — `spec`, `tech`, `bug`, `accessibility`. On ne
// réinvente pas cette taxinomie, on la lit.

/** Limites de GitHub, et les nôtres quand elles sont plus strictes. */
export const TITRE_MAXIMUM = 256
export const CORPS_MAXIMUM = 20_000
export const LABELS_MAXIMUM = 10

export type EtatTicket = 'open' | 'closed'

export interface Ticket {
  numero: number
  titre: string
  etat: EtatTicket
  labels: string[]
  /** Le label `couche/…`, s'il y en a un. */
  couche: string | null
  /** Le label `module/…`, s'il y en a un. */
  module: string | null
  /** Les labels sans préfixe : la nature du travail. */
  types: string[]
  url: string
  creeLe: string
  commentaires: number
}

export interface Filtres {
  etat?: EtatTicket | 'tous'
  couche?: string | null
  module?: string | null
  type?: string | null
}

/** Les familles de labels, pour proposer des filtres qui existent vraiment. */
export interface Familles {
  couches: string[]
  modules: string[]
  types: string[]
}

function texte(valeur: unknown): string {
  return valeur === undefined || valeur === null ? '' : String(valeur)
}

/**
 * Range les labels d'un dépôt en familles.
 *
 * Tout ce qui n'est ni `couche/…` ni `module/…` est une nature de travail : on
 * ne présume pas de la liste, on prend ce que le dépôt porte.
 */
export function rangerLabels(noms: string[]): Familles {
  const couches: string[] = []
  const modules: string[] = []
  const types: string[] = []

  for (const nom of noms) {
    if (nom.startsWith('couche/')) couches.push(nom)
    else if (nom.startsWith('module/')) modules.push(nom)
    else types.push(nom)
  }

  const trier = (l: string[]) => [...l].sort((a, b) => a.localeCompare(b, 'fr'))
  return { couches: trier(couches), modules: trier(modules), types: trier(types) }
}

/** Transforme une issue de l'API en ticket affichable. */
export function depuisIssue(brut: unknown): Ticket {
  const i = (brut ?? {}) as Record<string, unknown>
  const labels = Array.isArray(i.labels)
    ? i.labels.map(l => (typeof l === 'string' ? l : texte((l as Record<string, unknown>)?.name)))
      .filter(nom => nom !== '')
    : []

  const { couches, modules, types } = rangerLabels(labels)

  return {
    numero: Number(i.number ?? 0),
    titre: texte(i.title),
    etat: texte(i.state) === 'closed' ? 'closed' : 'open',
    labels,
    couche: couches[0] ?? null,
    module: modules[0] ?? null,
    types,
    url: texte(i.html_url),
    creeLe: texte(i.created_at),
    commentaires: Number(i.comments ?? 0),
  }
}

/**
 * Écarte les pull requests.
 *
 * L'API des issues les renvoie mêlées aux issues : une pull request porte un
 * champ `pull_request`. Les afficher comme des tickets serait faux.
 */
export function estUneIssue(brut: unknown): boolean {
  return (brut as Record<string, unknown>)?.pull_request === undefined
}

/** Applique les filtres, qui se combinent tous. */
export function filtrer(tickets: Ticket[], filtres: Filtres): Ticket[] {
  return tickets.filter((t) => {
    if (filtres.etat && filtres.etat !== 'tous' && t.etat !== filtres.etat) return false
    if (filtres.couche && t.couche !== filtres.couche) return false
    if (filtres.module && t.module !== filtres.module) return false
    if (filtres.type && !t.types.includes(filtres.type)) return false
    return true
  })
}

export interface Brouillon {
  titre: string
  corps: string
  labels: string[]
}

export type RefusCreation =
  | 'titre-absent'
  | 'titre-trop-long'
  | 'corps-trop-long'
  | 'label-inconnu'
  | 'trop-de-labels'

export type Validation =
  | { ok: true, valeur: Brouillon }
  | { ok: false, refus: RefusCreation, detail?: string }

/**
 * Vérifie un brouillon avant d'écrire chez GitHub.
 *
 * Les labels ne peuvent être **que** des labels existants : le dashboard ne crée
 * pas de label dans cairn-wms, ce que le cadrage n'autorise pas. Un label inconnu
 * est refusé plutôt que silencieusement écarté — l'auteur doit savoir que son
 * intention n'a pas été respectée.
 */
export function validerBrouillon(brouillon: {
  titre?: unknown
  corps?: unknown
  labels?: unknown
}, labelsExistants: string[]): Validation {
  const titre = texte(brouillon.titre).trim()
  if (titre === '') return { ok: false, refus: 'titre-absent' }
  if (titre.length > TITRE_MAXIMUM) return { ok: false, refus: 'titre-trop-long' }

  const corps = texte(brouillon.corps)
  if (corps.length > CORPS_MAXIMUM) return { ok: false, refus: 'corps-trop-long' }

  const demandes = Array.isArray(brouillon.labels)
    ? brouillon.labels.map(texte).filter(l => l !== '')
    : []

  if (demandes.length > LABELS_MAXIMUM) return { ok: false, refus: 'trop-de-labels' }

  const connus = new Set(labelsExistants)
  const inconnu = demandes.find(l => !connus.has(l))
  if (inconnu !== undefined) return { ok: false, refus: 'label-inconnu', detail: inconnu }

  // Doublons écartés : GitHub les accepterait, mais l'intention est la même.
  const labels = [...new Set(demandes)]

  return { ok: true, valeur: { titre, corps, labels } }
}

/**
 * Ce qui peut faire échouer une création chez GitHub.
 *
 * Deux cas n'existent pas en lecture : GitHub refuse un contenu qu'il juge
 * invalide, et un dépôt qu'on ne peut pas écrire se présente parfois comme
 * introuvable — c'est un droit insuffisant, pas un ticket absent. Le dire
 * autrement enverrait l'auteur chercher au mauvais endroit.
 */
export type EchecCreation = 'refuse' | 'quota' | 'invalide' | 'injoignable'

export function interpreterEchecCreation(erreur: unknown): EchecCreation {
  const e = erreur as { status?: number, response?: { headers?: Record<string, string> } }
  const code = e?.status

  if (code === undefined) return 'injoignable'
  if (code === 401) return 'refuse'

  if (code === 403 || code === 429) {
    const restant = e?.response?.headers?.['x-ratelimit-remaining']
    return restant === '0' ? 'quota' : 'refuse'
  }

  if (code === 422) return 'invalide'
  // Sur une écriture, GitHub masque en « introuvable » ce qui est en fait un
  // droit manquant : on ne prétend pas que le dépôt n'existe pas.
  if (code === 404) return 'refuse'
  return 'injoignable'
}

export const ECHECS_CREATION: Record<EchecCreation, { titre: string, detail: string }> = {
  refuse: {
    titre: 'Création refusée par GitHub',
    detail: 'Le jeton du dashboard n\'a pas le droit de créer un ticket dans cairn-wms. Rien n\'a été écrit.',
  },
  quota: {
    titre: 'Quota GitHub épuisé',
    detail: 'Le dashboard a atteint sa limite d\'appels. Rien n\'a été écrit ; réessayez après la remise à zéro.',
  },
  invalide: {
    titre: 'Ticket refusé',
    detail: 'GitHub n\'a pas accepté ce contenu. Vérifiez le titre et les labels ; rien n\'a été écrit.',
  },
  injoignable: {
    titre: 'GitHub injoignable',
    detail: 'Le dashboard n\'a pas pu joindre GitHub. Rien n\'a probablement été écrit — vérifiez la liste avant de réessayer.',
  },
}

/** Ce qu'on dit à l'écran pour chaque refus. Une phrase, sans jargon. */
export const REFUS: Record<RefusCreation, string> = {
  'titre-absent': 'Un titre est nécessaire : c\'est ce qui permettra de retrouver ce ticket.',
  'titre-trop-long': `Le titre dépasse ${TITRE_MAXIMUM} caractères, la limite de GitHub.`,
  'corps-trop-long': `La description dépasse ${CORPS_MAXIMUM} caractères.`,
  'label-inconnu': 'Ce label n\'existe pas dans cairn-wms. Le dashboard n\'en crée pas : seuls les labels du dépôt peuvent être posés.',
  'trop-de-labels': `Pas plus de ${LABELS_MAXIMUM} labels sur un même ticket.`,
}
