// L'historique des événements — fiches 0006 et 0007.
//
// **Seul module à toucher `node:sqlite`.** La fiche 0006 retient le module de
// Node pour n'ajouter aucune dépendance, en acceptant qu'il soit expérimental
// sous Node 22 ; isoler l'accès ici est ce qui rendra un changement peu coûteux
// si son API bougeait. Aucun autre fichier ne doit l'importer.
//
// Le schéma est celui de la fiche 0007 : une table, la charge conservée entière,
// et `livraison UNIQUE` comme garde-fou contre les doublons — c'est la base, non
// le code, qui garantit qu'une livraison réémise n'entre qu'une fois.
import { DatabaseSync } from 'node:sqlite'

export type Base = DatabaseSync

/** Où vit la base quand rien n'est configuré : à côté du projet, jamais en production. */
export const CHEMIN_PAR_DEFAUT = '.data/cairn.db'

/** Conservation retenue par la fiche 0007. */
export const CONSERVATION_JOURS = 365

export interface Evenement {
  livraison: string
  source: string
  type: string
  action: string | null
  depot: string | null
  auteur: string | null
  titre: string | null
  url: string | null
  recuLe: string
  charge: string
}

export interface EvenementLu extends Evenement {
  id: number
}

/**
 * Les migrations, dans l'ordre, chacune appliquée une fois.
 *
 * Une base absente n'est pas un cas à part : la migration 1 la crée. On
 * n'écrit donc jamais de code « première fois », qui serait le seul chemin
 * jamais éprouvé.
 */
const MIGRATIONS: Array<{ version: number, sql: string }> = [
  {
    version: 1,
    sql: `
      CREATE TABLE evenements (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        livraison TEXT    NOT NULL UNIQUE,
        source    TEXT    NOT NULL,
        type      TEXT    NOT NULL,
        action    TEXT,
        depot     TEXT,
        auteur    TEXT,
        titre     TEXT,
        url       TEXT,
        recu_le   TEXT    NOT NULL,
        charge    TEXT    NOT NULL
      );
      CREATE INDEX evenements_recents ON evenements (recu_le DESC);
      CREATE INDEX evenements_par_type ON evenements (type, recu_le DESC);
    `,
  },
]

export function ouvrir(chemin: string): Base {
  const db = new DatabaseSync(chemin)
  // Le mode WAL laisse lire pendant qu'on écrit : le fil se consulte même
  // quand une livraison arrive.
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  return db
}

/** Applique les migrations manquantes. Sans effet si tout est à jour. */
export function migrer(db: Base): number {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version      INTEGER PRIMARY KEY,
      appliquee_le TEXT NOT NULL
    )
  `)

  const faites = new Set(
    (db.prepare('SELECT version FROM migrations').all() as Array<{ version: number }>)
      .map(l => Number(l.version)),
  )

  let appliquees = 0

  for (const migration of MIGRATIONS) {
    if (faites.has(migration.version)) continue

    db.exec('BEGIN')
    try {
      db.exec(migration.sql)
      db.prepare('INSERT INTO migrations (version, appliquee_le) VALUES (?, ?)')
        .run(migration.version, new Date().toISOString())
      db.exec('COMMIT')
      appliquees += 1
    }
    catch (erreur) {
      db.exec('ROLLBACK')
      throw erreur
    }
  }

  return appliquees
}

export type Enregistrement = 'enregistre' | 'doublon'

/**
 * Enregistre un événement, ou constate que la livraison est déjà connue.
 *
 * GitHub réémet une livraison quand il n'obtient pas de réponse : le doublon
 * n'est pas une anomalie, c'est le fonctionnement normal. Il doit donc être
 * silencieux et rendre un succès, sans quoi GitHub réessaierait sans fin.
 */
export function enregistrer(db: Base, e: Evenement): Enregistrement {
  const deja = db.prepare('SELECT 1 FROM evenements WHERE livraison = ?').get(e.livraison)
  if (deja) return 'doublon'

  try {
    db.prepare(`
      INSERT INTO evenements (livraison, source, type, action, depot, auteur, titre, url, recu_le, charge)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e.livraison, e.source, e.type, e.action, e.depot, e.auteur, e.titre, e.url, e.recuLe, e.charge)
    return 'enregistre'
  }
  catch (erreur) {
    // Deux livraisons simultanées : la contrainte tranche, et c'est très bien.
    if (String((erreur as Error).message).includes('UNIQUE')) return 'doublon'
    throw erreur
  }
}

/** Les derniers événements, du plus récent au plus ancien. */
export function derniers(db: Base, limite = 50, type?: string | null): EvenementLu[] {
  const lignes = type
    ? db.prepare('SELECT * FROM evenements WHERE type = ? ORDER BY recu_le DESC, id DESC LIMIT ?').all(type, limite)
    : db.prepare('SELECT * FROM evenements ORDER BY recu_le DESC, id DESC LIMIT ?').all(limite)

  return (lignes as Array<Record<string, unknown>>).map(l => ({
    id: Number(l.id),
    livraison: String(l.livraison),
    source: String(l.source),
    type: String(l.type),
    action: l.action === null ? null : String(l.action),
    depot: l.depot === null ? null : String(l.depot),
    auteur: l.auteur === null ? null : String(l.auteur),
    titre: l.titre === null ? null : String(l.titre),
    url: l.url === null ? null : String(l.url),
    recuLe: String(l.recu_le),
    charge: String(l.charge),
  }))
}

export function compter(db: Base): number {
  const l = db.prepare('SELECT COUNT(*) AS n FROM evenements').get() as { n: number }
  return Number(l.n)
}

/** Efface ce qui dépasse la durée de conservation. Rend le nombre d'événements effacés. */
export function purger(db: Base, maintenant: Date = new Date(), jours = CONSERVATION_JOURS): number {
  const limite = new Date(maintenant.getTime() - jours * 24 * 3600 * 1000).toISOString()
  const avant = compter(db)
  db.prepare('DELETE FROM evenements WHERE recu_le < ?').run(limite)
  return avant - compter(db)
}

export type EtatBase = 'ok' | 'lecture-seule' | 'inaccessible'

/**
 * Éprouve la base **en lecture et en écriture**.
 *
 * Lire ne suffit pas : un volume monté en lecture seule laisse lire, et ne se
 * révèle qu'au premier webhook perdu. L'écriture est faite puis défaite, dans
 * une transaction annulée : elle ne laisse aucune trace.
 */
export function verifierBase(db: Base): EtatBase {
  try {
    db.prepare('SELECT COUNT(*) AS n FROM evenements').get()
  }
  catch {
    return 'inaccessible'
  }

  try {
    db.exec('BEGIN')
    db.prepare(`
      INSERT INTO evenements (livraison, source, type, action, depot, auteur, titre, url, recu_le, charge)
      VALUES (?, 'sonde', 'sonde', NULL, NULL, NULL, NULL, NULL, ?, '{}')
    `).run(`sonde-${Date.now()}-${Math.random().toString(16).slice(2)}`, new Date().toISOString())
    db.exec('ROLLBACK')
    return 'ok'
  }
  catch {
    try {
      db.exec('ROLLBACK')
    }
    catch {
      // La transaction n'était pas ouverte : rien à annuler.
    }
    return 'lecture-seule'
  }
}
