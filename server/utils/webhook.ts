// Réception des webhooks GitHub — tranche 5.
//
// Cette route est **publique par nécessité** : GitHub n'a pas de session. Elle
// est donc la seule porte ouverte du dashboard, et tout repose sur sa
// vérification. Quatre remparts, éprouvés par des cas qui doivent échouer :
//
//   1. la **taille** du corps, bornée avant toute lecture ;
//   2. la **signature** HMAC-SHA256, comparée à temps constant ;
//   3. l'**événement**, qui doit figurer dans une liste fermée ;
//   4. l'**identifiant de livraison**, qu'une contrainte de base rejette s'il
//      est déjà connu (`base.ts`).
//
// Les en-têtes sont ceux que GitHub documente, vérifiés à la source :
// `X-Hub-Signature-256` (HMAC-SHA256, préfixé `sha256=`), `X-GitHub-Delivery`
// (identifiant unique de la livraison), `X-GitHub-Event` (nom de l'événement).
// GitHub recommande explicitement une comparaison à temps constant.
import { createHmac, timingSafeEqual } from 'node:crypto'

/** Événements retenus. Tout le reste est ignoré, sans erreur : GitHub n'a pas à le savoir. */
export const EVENEMENTS = ['push', 'issues', 'pull_request', 'workflow_run'] as const
export type TypeEvenement = typeof EVENEMENTS[number]

/**
 * Taille maximale acceptée.
 *
 * GitHub annonce ne pas dépasser 25 Mo, mais une charge de cette taille n'a
 * aucun sens pour les événements retenus. On borne bien en deçà : un corps plus
 * gros est refusé **avant** d'être lu en entier.
 */
export const TAILLE_MAXIMALE = 1_000_000

export type RefusWebhook =
  | 'non-configure'
  | 'trop-gros'
  | 'signature-absente'
  | 'signature-invalide'
  | 'livraison-absente'
  | 'evenement-absent'
  | 'corps-illisible'

/** Vrai si l'événement est de ceux qu'on conserve. */
export function evenementRetenu(nom: unknown): nom is TypeEvenement {
  return (EVENEMENTS as readonly string[]).includes(String(nom ?? ''))
}

/**
 * Compare la signature reçue à celle attendue, à temps constant.
 *
 * Une comparaison ordinaire s'arrête au premier octet différent : le temps de
 * réponse renseigne alors sur le nombre d'octets corrects, et permet de
 * reconstituer une signature valide octet par octet. `timingSafeEqual` compare
 * toujours la totalité.
 */
export function signatureValide(corps: string, signature: unknown, secret: string): boolean {
  if (!secret) return false

  const recue = String(signature ?? '')
  if (!recue.startsWith('sha256=')) return false

  const attendue = `sha256=${createHmac('sha256', secret).update(corps, 'utf8').digest('hex')}`

  const a = Buffer.from(recue, 'utf8')
  const b = Buffer.from(attendue, 'utf8')
  // `timingSafeEqual` exige des longueurs égales ; une longueur différente est
  // de toute façon une signature fausse.
  if (a.length !== b.length) return false

  return timingSafeEqual(a, b)
}

export interface Resume {
  action: string | null
  depot: string | null
  auteur: string | null
  titre: string | null
  url: string | null
}

function texte(valeur: unknown): string | null {
  if (valeur === undefined || valeur === null) return null
  const t = String(valeur).trim()
  return t === '' ? null : t
}

/**
 * Tire d'une charge la ligne qu'on affichera.
 *
 * On ne devine pas : chaque événement a sa forme, et ce qui manque reste nul.
 * La charge entière étant conservée (fiche 0007), un résumé incomplet se
 * rattrape sans réémission.
 */
export function resumer(type: string, charge: Record<string, unknown>): Resume {
  const depot = texte((charge.repository as Record<string, unknown>)?.full_name)
  const action = texte(charge.action)

  if (type === 'push') {
    const commits = Array.isArray(charge.commits) ? charge.commits : []
    const premier = (commits[0] ?? {}) as Record<string, unknown>
    const branche = texte(charge.ref)?.replace(/^refs\/heads\//, '') ?? null
    return {
      action: null,
      depot,
      auteur: texte((charge.pusher as Record<string, unknown>)?.name)
        ?? texte((charge.sender as Record<string, unknown>)?.login),
      titre: branche === null
        ? `${commits.length} commit(s)`
        : `${commits.length} commit(s) sur ${branche}${texte(premier.message) ? ` — ${String(premier.message).split('\n')[0]}` : ''}`,
      url: texte(charge.compare),
    }
  }

  if (type === 'issues' || type === 'pull_request') {
    const objet = (charge[type === 'issues' ? 'issue' : 'pull_request'] ?? {}) as Record<string, unknown>
    return {
      action,
      depot,
      auteur: texte((charge.sender as Record<string, unknown>)?.login),
      titre: texte(objet.title) === null
        ? null
        : `#${texte(objet.number) ?? '?'} ${texte(objet.title)}`,
      url: texte(objet.html_url),
    }
  }

  if (type === 'workflow_run') {
    const run = (charge.workflow_run ?? {}) as Record<string, unknown>
    const conclusion = texte(run.conclusion)
    return {
      action,
      depot,
      auteur: texte((charge.sender as Record<string, unknown>)?.login),
      titre: texte(run.name) === null
        ? null
        : `${texte(run.name)}${conclusion ? ` — ${conclusion}` : ''}`,
      url: texte(run.html_url),
    }
  }

  return { action, depot, auteur: texte((charge.sender as Record<string, unknown>)?.login), titre: null, url: null }
}
