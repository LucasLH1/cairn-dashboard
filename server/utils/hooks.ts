// Réception des événements des sessions Claude Code — tranche 6, fiches 0008 et 0009.
//
// La seconde porte publique du dashboard : une session Claude Code n'a pas de
// cookie. Elle est donc authentifiée par un secret partagé, comparé à temps
// constant — la fiche 0008 explique pourquoi une signature HMAC, nécessaire pour
// GitHub qui ne peut pas porter d'en-tête, ne porterait rien de plus ici.
//
// **Le message n'est pas une charge de hook.** Le poste le construit à partir
// d'une liste blanche (fiche 0008) : le serveur reçoit des métadonnées, jamais
// le texte d'une demande, d'une commande ou d'un fichier. Ce module refuse tout
// ce qui ne ressemble pas à cette forme.
import { timingSafeEqual } from 'node:crypto'

/** Les quatre événements retenus par la fiche 0008. Le reste n'est pas émis, et serait refusé. */
export const EVENEMENTS_SESSION = ['SessionStart', 'SessionEnd', 'Stop', 'PostToolUse'] as const
export type EvenementSession = typeof EVENEMENTS_SESSION[number]

/**
 * Les dépôts dont on accepte les événements.
 *
 * Le script filtre déjà sur le poste (fiche 0008) ; le serveur revérifie, parce
 * qu'un garde-fou qui n'existe qu'à une extrémité n'en est pas un.
 */
export const DEPOTS_SUIVIS = ['cairn-wms', 'cairn-dashboard'] as const

/**
 * Taille maximale du corps.
 *
 * Un message de métadonnées pèse quelques centaines d'octets. Seize kilo-octets
 * laissent une marge large et refusent tout le reste **avant** lecture.
 */
export const TAILLE_MAXIMALE = 16_000

/** Débit maximal accepté, fiche 0008. Au-delà, on refuse sans rien écrire. */
export const DEBIT_PAR_MINUTE = 120

/** Longueur maximale d'un champ. Au-delà, le message est refusé, jamais tronqué. */
export const LONGUEUR_MAXIMALE = 200

export type RefusHook =
  | 'non-configure'
  | 'trop-gros'
  | 'secret-absent'
  | 'secret-invalide'
  | 'corps-illisible'
  | 'message-invalide'
  | 'evenement-inconnu'
  | 'depot-inconnu'
  | 'trop-rapide'

/**
 * Compare le secret reçu à celui attendu, à temps constant.
 *
 * Une comparaison ordinaire s'arrête au premier octet différent : le temps de
 * réponse renseigne alors sur le nombre d'octets corrects. `timingSafeEqual`
 * compare toujours la totalité.
 */
export function secretValide(recu: unknown, attendu: string): boolean {
  if (!attendu) return false

  const a = Buffer.from(String(recu ?? ''), 'utf8')
  const b = Buffer.from(attendu, 'utf8')
  // `timingSafeEqual` exige des longueurs égales ; une longueur différente est
  // de toute façon un secret faux.
  if (a.length !== b.length) return false

  return timingSafeEqual(a, b)
}

export function evenementRetenu(nom: unknown): nom is EvenementSession {
  return (EVENEMENTS_SESSION as readonly string[]).includes(String(nom ?? ''))
}

export function depotSuivi(nom: unknown): boolean {
  return (DEPOTS_SUIVIS as readonly string[]).includes(String(nom ?? ''))
}

/** Ce qu'un message porte, et rien d'autre. */
export interface MessageSession {
  cle: string
  evenement: EvenementSession
  session: string
  depot: string
  outil: string | null
  motif: string | null
  agent: string | null
  horodatage: string
}

/** Lit un champ obligatoire : non vide, borné, sinon nul. */
function obligatoire(valeur: unknown): string | null {
  if (typeof valeur !== 'string') return null
  const t = valeur.trim()
  if (t === '' || t.length > LONGUEUR_MAXIMALE) return null
  return t
}

/** Lit un champ facultatif : absent vaut nul, présent mais aberrant fait échouer. */
function facultatif(valeur: unknown): { ok: true, valeur: string | null } | { ok: false } {
  if (valeur === undefined || valeur === null) return { ok: true, valeur: null }
  if (typeof valeur !== 'string') return { ok: false }
  const t = valeur.trim()
  if (t === '') return { ok: true, valeur: null }
  if (t.length > LONGUEUR_MAXIMALE) return { ok: false }
  return { ok: true, valeur: t }
}

/**
 * Reconstruit un message à partir du corps reçu, champ par champ.
 *
 * On ne recopie pas le corps : on le lit. Un champ inconnu qu'une version future
 * ajouterait n'entrerait donc jamais dans la base — c'est ce que la fiche 0008
 * exige, et qu'aucune liste noire ne garantirait.
 */
export function lireMessage(corps: unknown): { ok: true, message: MessageSession } | { ok: false, refus: RefusHook } {
  if (typeof corps !== 'object' || corps === null || Array.isArray(corps)) {
    return { ok: false, refus: 'message-invalide' }
  }

  const brut = corps as Record<string, unknown>

  const cle = obligatoire(brut.cle)
  const session = obligatoire(brut.session)
  const depot = obligatoire(brut.depot)
  const horodatage = obligatoire(brut.horodatage)

  if (cle === null || session === null || depot === null || horodatage === null) {
    return { ok: false, refus: 'message-invalide' }
  }

  // Un horodatage qui n'en est pas un rendrait le fil incohérent sans jamais
  // échouer : on le refuse à l'entrée.
  if (Number.isNaN(Date.parse(horodatage))) return { ok: false, refus: 'message-invalide' }

  if (!evenementRetenu(brut.evenement)) return { ok: false, refus: 'evenement-inconnu' }
  if (!depotSuivi(depot)) return { ok: false, refus: 'depot-inconnu' }

  const outil = facultatif(brut.outil)
  const motif = facultatif(brut.motif)
  const agent = facultatif(brut.agent)

  if (!outil.ok || !motif.ok || !agent.ok) return { ok: false, refus: 'message-invalide' }

  return {
    ok: true,
    message: {
      cle,
      evenement: brut.evenement,
      session,
      depot,
      outil: outil.valeur,
      motif: motif.valeur,
      agent: agent.valeur,
      horodatage,
    },
  }
}

/**
 * Le débit, sur une fenêtre glissante d'une minute.
 *
 * En mémoire du serveur, comme le registre des connexions : une limite de débit
 * n'a de sens que pour le processus qui la subit, et une seule instance tourne
 * (fiche 0001).
 */
const fenetre: number[] = []

export function autoriserDebit(maintenant: number = Date.now()): boolean {
  const debut = maintenant - 60_000
  while (fenetre.length > 0 && (fenetre[0] as number) < debut) fenetre.shift()

  if (fenetre.length >= DEBIT_PAR_MINUTE) return false

  fenetre.push(maintenant)
  return true
}

/** Pour les tests : repart d'une fenêtre vide. */
export function viderDebit(): void {
  fenetre.length = 0
}

/**
 * La ligne qu'on affichera dans le fil.
 *
 * On ne devine rien : ce qui manque reste nul, et le titre se construit des
 * seules métadonnées reçues.
 */
export function titrePour(message: MessageSession): string {
  const motif = message.motif ? ` — ${message.motif}` : ''

  if (message.evenement === 'SessionStart') return `Session ouverte${motif}`
  if (message.evenement === 'SessionEnd') return `Session terminée${motif}`
  if (message.evenement === 'Stop') return 'Réponse terminée'

  return message.outil === null ? 'Fichier modifié' : `Fichier modifié — ${message.outil}`
}
