// Dates et heures, telles que les écrans les disent.
//
// Tout se calcule dans le fuseau du navigateur : ces fonctions ne servent
// qu'au rendu côté client, jamais au serveur, dont le fuseau est celui du
// conteneur.

const JOURS_COURTS = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM']
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

function deux(n: number): string {
  return String(n).padStart(2, '0')
}

/** La date d'un moment, au format `AAAA-MM-JJ`, dans le fuseau du poste. */
export function jourDe(moment: Date): string {
  return `${moment.getFullYear()}-${deux(moment.getMonth() + 1)}-${deux(moment.getDate())}`
}

/** « 14:02 » */
export function heureDe(moment: Date): string {
  return `${deux(moment.getHours())}:${deux(moment.getMinutes())}`
}

/** « 17 sept. » */
export function dateCourte(moment: Date): string {
  return `${moment.getDate()} ${MOIS_COURTS[moment.getMonth()]}`
}

/** « LUN » */
export function jourCourt(moment: Date): string {
  return JOURS_COURTS[moment.getDay()] ?? ''
}

/**
 * Lit la date d'une entrée de journal de cairn-wms, au format de son en-tête :
 * `AAAA-MM-JJ HH:MM`. Rend `null` si elle n'est pas lisible.
 */
export function lireDateJournal(texte: string | null | undefined): Date | null {
  if (!texte) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(texte.trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0))
  return Number.isNaN(d.getTime()) ? null : d
}

/** « il y a 3 min », « il y a 2 h », « hier », « 12 sept. » */
export function depuis(moment: Date, maintenant: Date = new Date()): string {
  const secondes = Math.round((maintenant.getTime() - moment.getTime()) / 1000)
  if (secondes < 45) return 'à l\'instant'
  const minutes = Math.round(secondes / 60)
  if (minutes < 60) return `il y a ${minutes} min`
  const heures = Math.round(minutes / 60)
  if (heures < 24 && jourDe(moment) === jourDe(maintenant)) return `il y a ${heures} h`
  const hier = new Date(maintenant)
  hier.setDate(hier.getDate() - 1)
  if (jourDe(moment) === jourDe(hier)) return 'hier'
  return dateCourte(moment)
}

/**
 * Les jours de la semaine d'un moment, du lundi au vendredi — et jusqu'au
 * dimanche si on le demande.
 */
export function joursDeLaSemaine(moment: Date, jusquAuDimanche = false): Date[] {
  const lundi = new Date(moment)
  lundi.setHours(0, 0, 0, 0)
  const decalage = (lundi.getDay() + 6) % 7
  lundi.setDate(lundi.getDate() - decalage)
  const combien = jusquAuDimanche ? 7 : 5
  return Array.from({ length: combien }, (_, i) => {
    const jour = new Date(lundi)
    jour.setDate(lundi.getDate() + i)
    return jour
  })
}

/** « 1 h 25 », « 47 min » */
export function duree(debut: Date, fin: Date): string {
  const minutes = Math.max(0, Math.round((fin.getTime() - debut.getTime()) / 60000))
  if (minutes < 60) return `${minutes} min`
  const heures = Math.floor(minutes / 60)
  const reste = minutes % 60
  return reste === 0 ? `${heures} h` : `${heures} h ${deux(reste)}`
}
