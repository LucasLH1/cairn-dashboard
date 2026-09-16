// L'instance unique de la base — fiches 0006 et 0007.
//
// Une seule base, ouverte une fois, partagée par toutes les requêtes du
// serveur : SQLite et l'instance unique vont de pair (fiche 0001).
//
// Le dossier parent est créé si besoin. En production il existe déjà — c'est le
// volume monté —, mais un chemin dont le dossier manque doit échouer clairement
// au démarrage, pas au premier webhook reçu.
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { CHEMIN_PAR_DEFAUT, migrer, ouvrir, purger } from './base'
import type { Base } from './base'

let instance: Base | null = null
let cheminOuvert: string | null = null

/** Le chemin réellement employé, d'après la configuration. */
export function cheminBase(config: { baseFichier?: unknown }): string {
  const demande = String(config.baseFichier ?? '').trim()
  return demande === '' ? CHEMIN_PAR_DEFAUT : demande
}

/**
 * Ouvre la base si besoin, et la rend.
 *
 * Les migrations sont appliquées à l'ouverture : une base absente est créée,
 * une base existante est mise à niveau, et il n'y a pas de cas « première
 * fois » qui serait le seul chemin jamais éprouvé.
 */
export function obtenirBase(config: { baseFichier?: unknown }): Base {
  const chemin = cheminBase(config)

  if (instance !== null && cheminOuvert === chemin) return instance

  if (chemin !== ':memory:') {
    mkdirSync(dirname(chemin), { recursive: true })
  }

  const db = ouvrir(chemin)
  migrer(db)

  instance = db
  cheminOuvert = chemin
  return db
}

/** Efface ce qui dépasse la conservation. Rend le nombre d'événements effacés. */
export function purgerBase(config: { baseFichier?: unknown }): number {
  return purger(obtenirBase(config))
}

/** Pour les tests : referme et oublie l'instance. */
export function fermerBase(): void {
  try {
    instance?.close()
  }
  catch {
    // Déjà fermée : rien à faire.
  }
  instance = null
  cheminOuvert = null
}
