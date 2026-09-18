// Amorce du fil en direct — fiche 0010.
//
// Les événements fictifs passent par les **vraies** routes de réception, signés
// comme GitHub et le script des hooks les signent : la vérification, la base et
// la diffusion sont celles de la production. Rien n'est écrit dans la base par
// un autre chemin.
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const FICHIER = join(import.meta.dirname, 'donnees', 'fil.json')

/** Les événements de `donnees/fil.json`, dans l'ordre où ils sont postés. */
export function lireEvenements() {
  return JSON.parse(readFileSync(FICHIER, 'utf8')).evenements
}

/**
 * Poste un événement à la route qui le reçoit en production.
 *
 * @param {string} base adresse du dashboard
 * @param {{ webhook: string, hooks: string }} secrets ceux du serveur visé
 * @param {object} evenement une entrée de `fil.json`
 * @param {string} identifiant distinct pour chaque envoi : la base écarte les doublons
 */
export function poster(base, secrets, evenement, identifiant) {
  if (evenement.source === 'github') {
    const corps = JSON.stringify(evenement.charge)
    return fetch(`${base}/webhooks/github`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-github-event': evenement.evenement,
        'x-github-delivery': `fictif-${identifiant}`,
        'x-hub-signature-256': `sha256=${createHmac('sha256', secrets.webhook).update(corps, 'utf8').digest('hex')}`,
      },
      body: corps,
    })
  }

  return fetch(`${base}/hooks/claude-code`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-cairn-hooks-secret': secrets.hooks },
    body: JSON.stringify({
      cle: `claude-code:fictif-${identifiant}`,
      evenement: evenement.evenement,
      session: evenement.session,
      depot: evenement.depot,
      outil: evenement.outil ?? null,
      motif: evenement.motif ?? null,
      agent: null,
      horodatage: new Date().toISOString(),
    }),
  })
}

/** Poste tout `fil.json`, dans l'ordre. Échoue au premier refus : il dirait un faux mal formé. */
export async function amorcer(base, secrets) {
  const evenements = lireEvenements()
  for (const [rang, evenement] of evenements.entries()) {
    const reponse = await poster(base, secrets, evenement, `amorce-${rang}`)
    if (!reponse.ok) {
      throw new Error(`${evenement.source} ${evenement.evenement} refusé : ${reponse.status} ${await reponse.text()}`)
    }
  }
  return evenements.length
}
