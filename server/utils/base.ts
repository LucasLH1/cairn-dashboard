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
  /** Session Claude Code d'où vient l'événement. Nul pour GitHub (fiche 0009). */
  session: string | null
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
export const MIGRATIONS: Array<{ version: number, sql: string }> = [
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
  {
    // Fiche 0009 : les événements des sessions Claude Code se regroupent par
    // session. La colonne reste nulle pour les événements GitHub, qui n'en ont
    // pas — et une colonne ajoutée nullable ne réécrit aucune ligne : ce qui a
    // déjà été reçu traverse la migration intact.
    version: 2,
    sql: `
      ALTER TABLE evenements ADD COLUMN session TEXT;
      CREATE INDEX evenements_par_session ON evenements (session, recu_le DESC);
    `,
  },
  {
    // Fiche 0011 : les jetons de rafraîchissement du connecteur MCP, par leur
    // seule empreinte. La rotation impose de les conserver : un jeton déjà
    // remplacé qui se représente révoque toute sa famille. C'est la seconde
    // donnée que la base porte, et la fiche 0011 la limite à cela.
    version: 3,
    sql: `
      CREATE TABLE jetons_mcp (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        empreinte   TEXT    NOT NULL UNIQUE,
        famille     TEXT    NOT NULL,
        client      TEXT    NOT NULL,
        sujet       TEXT    NOT NULL,
        portees     TEXT    NOT NULL,
        cree_le     TEXT    NOT NULL,
        expire_le   TEXT    NOT NULL,
        remplace_le TEXT
      );
      CREATE INDEX jetons_mcp_par_famille ON jetons_mcp (famille);
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
      INSERT INTO evenements (livraison, source, session, type, action, depot, auteur, titre, url, recu_le, charge)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e.livraison, e.source, e.session, e.type, e.action, e.depot, e.auteur, e.titre, e.url, e.recuLe, e.charge)
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
    session: l.session === null || l.session === undefined ? null : String(l.session),
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

// — Les jetons de rafraîchissement du connecteur MCP — fiche 0011 ——————————

export interface JetonRafraichissement {
  empreinte: string
  famille: string
  client: string
  sujet: string
  portees: string[]
  creeLe: string
  expireLe: string
}

/** Conserve l'empreinte d'un jeton de rafraîchissement neuf. */
export function conserverRafraichissement(db: Base, j: JetonRafraichissement): void {
  db.prepare(`
    INSERT INTO jetons_mcp (empreinte, famille, client, sujet, portees, cree_le, expire_le)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(j.empreinte, j.famille, j.client, j.sujet, j.portees.join(' '), j.creeLe, j.expireLe)
}

export type Rotation
  = | { ok: true, jeton: JetonRafraichissement }
    | { ok: false, raison: 'inconnu' | 'expire' | 'rejoue' }

/**
 * Consomme un jeton de rafraîchissement : le marque remplacé et rend ce qu'il
 * portait, pour qu'un successeur soit émis dans la même famille.
 *
 * Un jeton **déjà remplacé** qui se représente est le signe d'un vol — l'un des
 * deux porteurs n'est pas le client — et toute la famille est révoquée, comme
 * l'OAuth 2.1 le demande pour les clients publics.
 */
export function tournerRafraichissement(db: Base, empreinte: string, maintenant: Date = new Date()): Rotation {
  const ligne = db.prepare('SELECT * FROM jetons_mcp WHERE empreinte = ?').get(empreinte) as Record<string, unknown> | undefined
  if (!ligne) return { ok: false, raison: 'inconnu' }

  if (ligne.remplace_le !== null && ligne.remplace_le !== undefined) {
    db.prepare('DELETE FROM jetons_mcp WHERE famille = ?').run(String(ligne.famille))
    return { ok: false, raison: 'rejoue' }
  }

  if (String(ligne.expire_le) <= maintenant.toISOString()) {
    db.prepare('DELETE FROM jetons_mcp WHERE empreinte = ?').run(empreinte)
    return { ok: false, raison: 'expire' }
  }

  db.prepare('UPDATE jetons_mcp SET remplace_le = ? WHERE empreinte = ?').run(maintenant.toISOString(), empreinte)

  return {
    ok: true,
    jeton: {
      empreinte,
      famille: String(ligne.famille),
      client: String(ligne.client),
      sujet: String(ligne.sujet),
      portees: String(ligne.portees).split(' ').filter(Boolean),
      creeLe: String(ligne.cree_le),
      expireLe: String(ligne.expire_le),
    },
  }
}

/** Combien de jetons de rafraîchissement vivent, remplacés compris. */
export function compterRafraichissements(db: Base): number {
  const l = db.prepare('SELECT COUNT(*) AS n FROM jetons_mcp').get() as { n: number }
  return Number(l.n)
}

/** Efface les jetons de rafraîchissement expirés. Rend le nombre effacé. */
export function purgerRafraichissements(db: Base, maintenant: Date = new Date()): number {
  const avant = compterRafraichissements(db)
  db.prepare('DELETE FROM jetons_mcp WHERE expire_le <= ?').run(maintenant.toISOString())
  return avant - compterRafraichissements(db)
}
