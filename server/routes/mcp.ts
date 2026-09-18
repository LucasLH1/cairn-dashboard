// Le serveur MCP du dashboard — tranche 7, fiche 0011, cadrage §« Ce qu'il expose ».
//
// Une seule adresse, `/mcp`, Streamable HTTP sans état par le SDK officiel,
// servie à travers le pont Request/Response de h3. Avant que le SDK ne voie
// quoi que ce soit, cette route joue le *resource server* :
//
//   1. l'origine — un `Origin` étranger est refusé, contre le DNS rebinding ;
//   2. le jeton d'accès Bearer — forme, signature, expiration, **émetteur,
//      audience, client et compte**, tous comparés à ce que ce serveur est ;
//      tout manquement répond 401 avec `WWW-Authenticate`, seule réponse que
//      Claude comprend comme « connecte-toi » ;
//   3. les portées — écrire exige `docs:write`, sinon 403 `insufficient_scope`.
//
// Trois outils, et rien d'autre : lister, lire, écrire dans `docs/` de
// cairn-wms — l'écriture bornée par `ecriture-doc.ts`, quelle que soit la
// formulation reçue de l'assistant.
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'
import * as z from 'zod/v4'
import { BRANCHE, creerClient, ErreurDoc, interpreterErreur, organiserArbre, viderCaches } from '../utils/doc-github'
import { MESSAGES } from '../utils/echec-doc'
import { ecrireDocument, ErreurEcriture, lireDocumentBrut, RESUME_MAXIMUM, TAILLE_MAXIMALE, verifierEcriture } from '../utils/ecriture-doc'
import { lireJetonAcces } from '../utils/mcp-jetons'
import { repondreJson } from '../utils/reponse'

const NOM = 'cairn-dashboard'
const VERSION = '1.0.0'

/** Ce qu'un outil sait de celui qui l'appelle. */
interface Appelant {
  sujet: string
  portees: string[]
}

const REFUS_ECRITURE: Record<string, string> = {
  'chemin': 'Le chemin doit rester dans docs/ de cairn-wms, sans « docs/ » en tête, et désigner un fichier .md.',
  'resume': `Le résumé est obligatoire, tient sur une ligne de ${RESUME_MAXIMUM} caractères au plus, et ne commence pas par « docs: » — le serveur pose ce préfixe lui-même.`,
  'contenu-vide': 'Le contenu est vide.',
  'trop-gros': `Le contenu dépasse ${TAILLE_MAXIMALE} octets.`,
}

const ECHECS_ECRITURE: Record<string, string> = {
  'refuse': 'Le jeton GitHub du dashboard n\'a pas le droit d\'écrire dans cairn-wms : l\'écriture est empêchée, rien n\'a été modifié.',
  'conflit': 'Le document a changé depuis sa lecture : relisez-le, puis réécrivez avec son nouveau sha.',
  'existe-deja': 'Le document existe déjà : lisez-le d\'abord, puis réécrivez avec son sha.',
  'absent': 'Le dépôt, la branche ou le chemin est introuvable.',
  'injoignable': 'GitHub est injoignable.',
}

function texte(contenu: string) {
  return { content: [{ type: 'text' as const, text: contenu }] }
}

function echec(contenu: string) {
  return { ...texte(contenu), isError: true as const }
}

function construireServeur(appelant: Appelant): McpServer {
  const config = useRuntimeConfig()
  const jeton = String(config.githubToken ?? '')
  const depot = String(config.githubRepo ?? '')
  const serveur = new McpServer({ name: NOM, version: VERSION })

  serveur.registerTool(
    'lister_documents',
    {
      title: 'Lister la documentation de cairn-wms',
      description: `Les documents Markdown de docs/ dans le dépôt ${depot}, sur la branche ${BRANCHE}, groupés par dossier. Les chemins rendus sont relatifs à docs/.`,
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const groupes = organiserArbre(await creerClient(jeton, depot, BRANCHE).arbre())
        const lignes = groupes.flatMap(g => [
          `## ${g.dossier ?? '(racine)'}`,
          ...g.documents.map(d => `- ${d.chemin} (${d.taille} octets)`),
        ])
        return texte(lignes.join('\n') || 'Aucun document.')
      }
      catch (erreur) {
        const cause = erreur instanceof ErreurDoc ? erreur.echec : interpreterErreur(erreur)
        return echec(`${MESSAGES[cause].titre} — ${MESSAGES[cause].detail}`)
      }
    },
  )

  serveur.registerTool(
    'lire_document',
    {
      title: 'Lire un document de cairn-wms',
      description: `Le contenu Markdown d'un document de docs/ dans ${depot}, sur ${BRANCHE}, et son sha — à conserver pour le réécrire.`,
      inputSchema: z.object({
        chemin: z.string().describe('Chemin relatif à docs/, par exemple socle/0.1-organisation.md'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ chemin }) => {
      try {
        const lu = await lireDocumentBrut(jeton, depot, chemin)
        return texte(`sha: ${lu.sha}\nchemin: ${chemin}\n\n${lu.contenu}`)
      }
      catch (erreur) {
        if (erreur instanceof ErreurEcriture) return echec(ECHECS_ECRITURE[erreur.echec] ?? erreur.message)
        return echec('Lecture impossible.')
      }
    },
  )

  serveur.registerTool(
    'ecrire_document',
    {
      title: 'Écrire un document dans docs/ de cairn-wms',
      description: `Crée ou met à jour un document Markdown de docs/ dans ${depot}, sur la branche ${BRANCHE}, par un commit dont le message commence par « docs: ». Pour mettre à jour, fournir le sha rendu par lire_document. Aucune autre écriture n'est possible.`,
      inputSchema: z.object({
        chemin: z.string().describe('Chemin relatif à docs/, en .md'),
        contenu: z.string().describe('Le contenu Markdown complet du document'),
        resume: z.string().describe(`Ce que change ce commit, sur une ligne de ${RESUME_MAXIMUM} caractères au plus ; le serveur le préfixe de « docs: »`),
        sha: z.string().optional().describe('Le sha du document lu, obligatoire pour une mise à jour'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      if (!appelant.portees.includes('docs:write')) {
        return echec('La portée docs:write n\'a pas été accordée à cette connexion.')
      }
      const verification = verifierEcriture(args)
      if (!verification.ok) return echec(REFUS_ECRITURE[verification.refus] ?? 'Demande refusée.')
      try {
        const resultat = await ecrireDocument(jeton, depot, verification.ecriture)
        viderCaches()
        return texte(`Écrit : docs/${resultat.chemin} sur ${BRANCHE}, commit ${resultat.commit.slice(0, 7)}, nouveau sha ${resultat.sha}.${resultat.url ? `\n${resultat.url}` : ''}`)
      }
      catch (erreur) {
        if (erreur instanceof ErreurEcriture) return echec(ECHECS_ECRITURE[erreur.echec] ?? erreur.message)
        return echec('Écriture impossible.')
      }
    },
  )

  return serveur
}

/** Le gestionnaire du SDK, créé une fois ; sa fabrique tourne à chaque requête. */
let gestionnaire: ReturnType<typeof createMcpHandler> | null = null

function obtenirGestionnaire() {
  gestionnaire ??= createMcpHandler((ctx) => {
    const extra = (ctx.authInfo?.extra ?? {}) as Record<string, unknown>
    return construireServeur({
      sujet: String(extra.sujet ?? ''),
      portees: ctx.authInfo?.scopes ?? [],
    })
  })
  return gestionnaire
}

/** Vrai si ce corps JSON-RPC appelle l'outil d'écriture. */
function appelleEcriture(corps: unknown): boolean {
  const messages = Array.isArray(corps) ? corps : [corps]
  return messages.some((m) => {
    if (!m || typeof m !== 'object') return false
    const message = m as { method?: unknown, params?: { name?: unknown } }
    return message.method === 'tools/call' && message.params?.name === 'ecrire_document'
  })
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true })
  const origine = url.origin

  const etat = etatConnecteur(config)
  if (etat !== 'ok') {
    repondreJson(event, 503, { error: 'server_error', error_description: `connecteur non configuré : ${etat}` })
    return
  }

  // Contre le DNS rebinding : un navigateur qui annonce une autre origine est refusé.
  const origineAnnoncee = getHeader(event, 'origin')
  if (origineAnnoncee && origineAnnoncee !== origine) {
    repondreJson(event, 403, { error: 'invalid_request', error_description: 'origine refusée' })
    return
  }

  const autorisation = String(getHeader(event, 'authorization') ?? '')
  const porteur = /^Bearer\s+(\S+)$/i.exec(autorisation)
  if (!porteur) {
    repondreJson(event, 401, { error: 'invalid_token', error_description: 'jeton d\'accès requis' }, {
      'www-authenticate': defiBearer(origine, { portee: 'docs:read docs:write' }),
    })
    return
  }

  const lecture = lireJetonAcces(porteur[1] ?? '', String(config.mcpSecret))
  const revendications = lecture.ok ? lecture.revendications : null
  const raison = !lecture.ok
    ? `jeton ${lecture.raison}`
    : (revendications!.iss !== origine
        ? 'émetteur inattendu'
        : (!ressourceAttendue(revendications!.aud, origine)
            ? 'audience inattendue'
            : (revendications!.client_id !== String(config.mcpClientId)
                ? 'client inattendu'
                : (!estAutorise(Number(revendications!.sub), String(config.allowedGithubId ?? ''))
                    ? 'compte non autorisé'
                    : null))))

  if (raison !== null || revendications === null) {
    repondreJson(event, 401, { error: 'invalid_token', error_description: raison ?? 'jeton invalide' }, {
      'www-authenticate': defiBearer(origine, { erreur: 'invalid_token', description: raison ?? 'jeton invalide', portee: 'docs:read docs:write' }),
    })
    return
  }

  const portees = revendications.scope.split(' ').filter(Boolean)

  let corps: unknown
  if (event.method === 'POST') {
    const brut = await readRawBody(event, 'utf8')
    try {
      corps = typeof brut === 'string' && brut !== '' ? JSON.parse(brut) : undefined
    }
    catch {
      repondreJson(event, 400, { error: 'invalid_request', error_description: 'corps JSON illisible' })
      return
    }
    // Écrire exige sa portée ; la garde est ici, au niveau HTTP, pour que
    // Claude propose de réautoriser plutôt que de montrer une erreur d'outil.
    if (appelleEcriture(corps) && !portees.includes('docs:write')) {
      repondreJson(event, 403, { error: 'insufficient_scope', error_description: 'écrire exige docs:write' }, {
        'www-authenticate': defiBearer(origine, { erreur: 'insufficient_scope', portee: 'docs:read docs:write' }),
      })
      return
    }
  }

  const reponse = await obtenirGestionnaire().fetch(toWebRequest(event), {
    authInfo: {
      token: porteur[1] ?? '',
      clientId: revendications.client_id,
      scopes: portees,
      expiresAt: revendications.exp,
      extra: { sujet: revendications.sub },
    },
    ...(corps === undefined ? {} : { parsedBody: corps }),
  })

  return sendWebResponse(event, reponse)
})
