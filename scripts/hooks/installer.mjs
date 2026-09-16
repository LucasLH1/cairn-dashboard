#!/usr/bin/env node
// Installe le script d'envoi des événements de session à son emplacement fixe.
//
// Fiche 0008 : le script est versionné et éprouvé dans ce seul dépôt, puis
// installé sur le poste. Chaque dépôt suivi l'appelle depuis son propre
// `.claude/settings.json`, qui ne connaît que ce chemin — et s'il n'y a rien à
// ce chemin, le hook échoue en silence.
import { chmodSync, copyFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ici = dirname(fileURLToPath(import.meta.url))
const source = join(ici, 'cairn-hooks.mjs')

export const DOSSIER = join(homedir(), '.local', 'bin')
export const CIBLE = join(DOSSIER, 'cairn-hooks')

try {
  mkdirSync(DOSSIER, { recursive: true })
  copyFileSync(source, CIBLE)
  chmodSync(CIBLE, 0o755)

  console.info(`Installé : ${CIBLE}`)
  console.info('')
  console.info('Il reste à définir le secret, hors de tout dépôt, dans la section « env »')
  console.info('de ~/.claude/settings.json (droits 600) :')
  console.info('')
  console.info('  { "env": { "CAIRN_HOOKS_SECRET": "…" } }')
  console.info('')
  console.info('Puis ouvrir une nouvelle session Claude Code pour qu\'elle la prenne.')
}
catch (erreur) {
  console.error(`Installation impossible : ${erreur.message}`)
  process.exit(1)
}
