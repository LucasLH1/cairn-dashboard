// Les jetons du connecteur MCP — fiche 0011.
//
// Le jeton d'accès se vérifie seul : un JWT signé HMAC-SHA256 avec le secret du
// connecteur, d'une heure, qui porte son audience — l'URI canonique du serveur
// MCP — et son sujet — l'identifiant numérique GitHub du compte. Rien n'est
// conservé à son propos. Tout ce qui s'y lit est revérifié à chaque requête,
// audience et sujet compris : le sceau prouve l'émetteur, pas le droit.
//
// Le jeton de rafraîchissement, lui, est opaque : 32 octets aléatoires remis une
// fois, dont seule l'empreinte SHA-256 est conservée en base (`base.ts`). On ne
// peut donc pas le reconstituer depuis la base, ni le lire dans un journal.
//
// Écrit avec `node:crypto` seulement : aucune bibliothèque de JWT, pour une
// signature d'une ligne et une vérification qu'on veut lire en entier.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/** Durée de vie d'un jeton d'accès. Courte : c'est ce que la spécification demande. */
export const DUREE_ACCES_S = 3600

/** Durée de vie d'un jeton de rafraîchissement, et donc d'une connexion sans reconsentir. */
export const DUREE_RAFRAICHISSEMENT_JOURS = 30

/** Longueur minimale du secret de signature, comme pour la session (tranche 1b). */
export const LONGUEUR_MINIMALE_SECRET = 32

export interface RevendicationsAcces {
  /** L'émetteur : l'origine du dashboard. */
  iss: string
  /** L'audience : l'URI canonique du serveur MCP, celle que le client a demandée. */
  aud: string
  /** Le sujet : l'identifiant numérique GitHub du compte, en chaîne. */
  sub: string
  client_id: string
  /** Les portées accordées, séparées par des espaces. */
  scope: string
  iat: number
  exp: number
  jti: string
}

const ENTETE = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')

function signature(donnees: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(donnees).digest()
}

/** Signe des revendications. Le secret est celui du connecteur, jamais celui de la session. */
export function signerJetonAcces(revendications: RevendicationsAcces, secret: string): string {
  const charge = Buffer.from(JSON.stringify(revendications)).toString('base64url')
  const donnees = `${ENTETE}.${charge}`
  return `${donnees}.${signature(donnees, secret).toString('base64url')}`
}

export type LectureAcces
  = | { ok: true, revendications: RevendicationsAcces }
    | { ok: false, raison: 'forme' | 'algorithme' | 'signature' | 'contenu' | 'expire' }

/**
 * Lit et vérifie un jeton d'accès : forme, algorithme, signature à temps constant,
 * contenu, expiration. L'audience et le sujet ne sont **pas** jugés ici — c'est
 * à celui qui sert la requête de les comparer à ce qu'il attend.
 */
export function lireJetonAcces(jeton: string, secret: string, maintenantMs = Date.now()): LectureAcces {
  const morceaux = String(jeton ?? '').split('.')
  if (morceaux.length !== 3 || morceaux.some(m => m === '')) return { ok: false, raison: 'forme' }
  const [entete, charge, signe] = morceaux as [string, string, string]

  // Seul l'algorithme qu'on émet est accepté : un jeton « none » ou RS256 est refusé avant tout.
  if (entete !== ENTETE) return { ok: false, raison: 'algorithme' }

  const attendue = signature(`${entete}.${charge}`, secret)
  const recue = Buffer.from(signe, 'base64url')
  if (recue.length !== attendue.length || !timingSafeEqual(recue, attendue)) {
    return { ok: false, raison: 'signature' }
  }

  let lu: unknown
  try {
    lu = JSON.parse(Buffer.from(charge, 'base64url').toString('utf8'))
  }
  catch {
    return { ok: false, raison: 'contenu' }
  }

  if (typeof lu !== 'object' || lu === null) return { ok: false, raison: 'contenu' }
  const r = lu as Record<string, unknown>
  const texte = (v: unknown) => typeof v === 'string' && v !== ''
  const nombre = (v: unknown) => typeof v === 'number' && Number.isFinite(v)
  if (!texte(r.iss) || !texte(r.aud) || !texte(r.sub) || !texte(r.client_id) || typeof r.scope !== 'string'
    || !nombre(r.iat) || !nombre(r.exp) || !texte(r.jti)) {
    return { ok: false, raison: 'contenu' }
  }

  if ((r.exp as number) * 1000 <= maintenantMs) return { ok: false, raison: 'expire' }

  return { ok: true, revendications: r as unknown as RevendicationsAcces }
}

/** Émet un jeton d'accès d'une heure pour ce sujet, ce client, ces portées. */
export function emettreJetonAcces(options: {
  emetteur: string
  audience: string
  sujet: string
  client: string
  portees: string[]
  secret: string
  maintenantMs?: number
}): { jeton: string, expireDansS: number } {
  const iat = Math.floor((options.maintenantMs ?? Date.now()) / 1000)
  const jeton = signerJetonAcces({
    iss: options.emetteur,
    aud: options.audience,
    sub: options.sujet,
    client_id: options.client,
    scope: options.portees.join(' '),
    iat,
    exp: iat + DUREE_ACCES_S,
    jti: randomBytes(12).toString('base64url'),
  }, options.secret)
  return { jeton, expireDansS: DUREE_ACCES_S }
}

/** Un jeton de rafraîchissement neuf : 32 octets aléatoires, remis une seule fois. */
export function nouveauJetonRafraichissement(): string {
  return randomBytes(32).toString('base64url')
}

/** L'empreinte conservée en base — jamais le jeton lui-même. */
export function empreinte(jeton: string): string {
  return createHash('sha256').update(jeton, 'utf8').digest('hex')
}

/** Un identifiant de famille : tous les jetons issus d'un même consentement le partagent. */
export function nouvelleFamille(): string {
  return randomBytes(12).toString('base64url')
}
