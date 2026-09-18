#!/usr/bin/env node
// Envoi des événements d'une session Claude Code au dashboard — fiches 0008 et 0009.
//
// Ce script est appelé par un hook `command` **asynchrone** : Claude Code le
// lance et continue sans l'attendre. Il ne doit donc jamais faire échouer quoi
// que ce soit — **il sort toujours en 0**, quoi qu'il arrive.
//
// Il est **autonome par nécessité** : il s'exécute depuis l'emplacement où il a
// été installé, hors du dépôt, et ne peut donc rien importer de celui-ci. Il
// n'emploie que Node, qui est forcément présent puisque Claude Code en dépend —
// là où `jq`, `curl` et `openssl` ne le sont pas tous.
//
// **Il construit le message, il ne recopie pas la charge.** Une charge de hook
// porte le texte des demandes, des commandes et des fichiers, jusque dans
// `background_tasks[].command` et `session_crons[].prompt`. Seuls les champs
// listés ici sortent du poste.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Les quatre événements retenus par la fiche 0008. */
const EVENEMENTS = ['SessionStart', 'SessionEnd', 'Stop', 'PostToolUse']

/** Les outils dont une fin d'usage est retenue : ceux qui écrivent. */
const OUTILS = ['Edit', 'Write', 'NotebookEdit']

/** Les seuls dépôts d'où ce script émet. */
const DEPOTS = ['cairn-wms', 'cairn-dashboard']

const ADRESSE_PAR_DEFAUT = 'https://monitoring.cairn-wms.fr/hooks/claude-code'

/** Court : le dashboard est joignable ou il ne l'est pas. On n'attend pas. */
const DELAI_MS = 3000

/** Remonte de `depart` jusqu'au dossier qui porte un `.git`, et rend son nom. */
function depotDe(depart) {
  let dossier = depart
  for (let i = 0; i < 40; i += 1) {
    if (existsSync(join(dossier, '.git'))) return basename(dossier)
    const parent = dirname(dossier)
    if (parent === dossier) return null
    dossier = parent
  }
  return null
}

/**
 * Le compteur propre à la session (fiche 0009).
 *
 * Sans verrou, et c'est voulu : les seuls événements qui l'emploient —
 * ouverture, fin de session, fin de réponse — ne sont jamais concurrents. Ceux
 * qui le sont, les usages d'outil, portent `tool_use_id` et n'en ont pas besoin.
 */
function prochainCompteur(session) {
  const racine = process.env.XDG_STATE_HOME || join(homedir(), '.local', 'state')
  const dossier = join(racine, 'cairn-hooks')
  const fichier = join(dossier, session.replace(/[^A-Za-z0-9_-]/g, '_'))

  try {
    mkdirSync(dossier, { recursive: true })
    const precedent = existsSync(fichier) ? Number.parseInt(readFileSync(fichier, 'utf8'), 10) : 0
    const suivant = Number.isFinite(precedent) ? precedent + 1 : 1
    writeFileSync(fichier, String(suivant), 'utf8')
    return suivant
  }
  catch {
    // Pas d'état possible : l'horodatage à la milliseconde distingue seul. On
    // préfère un envoi qu'un silence.
    return 0
  }
}

/** Efface le compteur d'une session terminée : rien ne sert de le garder. */
function oublierCompteur(session) {
  try {
    const racine = process.env.XDG_STATE_HOME || join(homedir(), '.local', 'state')
    rmSync(join(racine, 'cairn-hooks', session.replace(/[^A-Za-z0-9_-]/g, '_')), { force: true })
  }
  catch {
    // Sans importance.
  }
}

function texte(valeur) {
  if (typeof valeur !== 'string') return null
  const t = valeur.trim()
  return t === '' ? null : t
}

/** Construit le message, champ par champ, depuis la liste blanche de la fiche 0008. */
export function construire(entree, depot, horodatage, compteur) {
  const evenement = texte(entree.hook_event_name)
  const session = texte(entree.session_id)

  if (evenement === null || session === null) return null
  if (!EVENEMENTS.includes(evenement)) return null

  const outil = evenement === 'PostToolUse' ? texte(entree.tool_name) : null

  // Le matcher filtre déjà côté configuration ; on revérifie, pour qu'un
  // réglage recopié de travers n'ouvre pas le robinet.
  if (evenement === 'PostToolUse' && (outil === null || !OUTILS.includes(outil))) return null

  const appel = texte(entree.tool_use_id)
  const cle = appel === null
    ? `claude-code:${createHash('sha256').update(`${session}|${evenement}|${horodatage}|${compteur}`).digest('hex')}`
    : `claude-code:${appel}`

  return {
    cle,
    evenement,
    session,
    depot,
    outil,
    motif: evenement === 'SessionStart' ? texte(entree.source) : (evenement === 'SessionEnd' ? texte(entree.reason) : null),
    agent: texte(entree.agent_type),
    horodatage,
  }
}

async function lireEntree() {
  const morceaux = []
  for await (const morceau of process.stdin) morceaux.push(morceau)
  return Buffer.concat(morceaux).toString('utf8')
}

async function principal() {
  const secret = process.env.CAIRN_HOOKS_SECRET
  if (!secret) return

  let entree
  try {
    entree = JSON.parse(await lireEntree())
  }
  catch {
    return
  }
  if (typeof entree !== 'object' || entree === null) return

  const depot = depotDe(texte(entree.cwd) ?? process.cwd())
  if (depot === null || !DEPOTS.includes(depot)) return

  const session = texte(entree.session_id)
  if (session === null) return

  const message = construire(entree, depot, new Date().toISOString(), prochainCompteur(session))
  if (message === null) return

  const arret = new AbortController()
  const minuteur = setTimeout(() => arret.abort(), DELAI_MS)

  try {
    await fetch(process.env.CAIRN_HOOKS_URL || ADRESSE_PAR_DEFAUT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-cairn-hooks-secret': secret },
      body: JSON.stringify(message),
      signal: arret.signal,
    })
  }
  catch {
    // Le dashboard est injoignable : l'événement est perdu, et c'est assumé
    // (fiche 0008). Une session de travail ne s'interrompt pas pour si peu.
  }
  finally {
    clearTimeout(minuteur)
  }

  if (message.evenement === 'SessionEnd') oublierCompteur(session)
}

/**
 * Vrai si ce fichier est le programme lancé, et non un module importé.
 *
 * On compare les **chemins réels**, jamais les noms. Un premier garde-fou
 * testait le nom `cairn-hooks.mjs` ; or l'installateur copie le script sous
 * `cairn-hooks`, sans extension. La copie installée était donc inerte — en
 * silence, puisqu'un hook ne doit jamais échouer —, et les tests ne l'ont pas
 * vu parce qu'ils lançaient le fichier du dépôt, qui portait le bon nom.
 */
function estLeProgramme() {
  if (!process.argv[1]) return false
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
  }
  catch {
    return false
  }
}

if (estLeProgramme()) {
  principal().catch(() => {}).finally(() => process.exit(0))
}
