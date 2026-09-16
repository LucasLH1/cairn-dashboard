// Le script d'envoi est le seul morceau de la tranche qui s'exécute **sur le
// poste**, hors du serveur. C'est lui qui décide de ce qui quitte la machine.
//
// On ne l'éprouve donc pas en important ses fonctions : on le **lance**, avec
// une vraie entrée sur son entrée standard et un vrai serveur en face. Ce qui
// est vérifié ici, c'est ce qui sort, pas ce qu'on croit qu'il ferait.
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = resolve('scripts/hooks/cairn-hooks.mjs')
const RACINE = resolve('.')
const SECRET = 'un-secret-de-hooks-pour-l-epreuve'

interface Recu {
  entetes: Record<string, string | string[] | undefined>
  corps: Record<string, unknown>
}

let serveur: Server
let adresse: string
let recus: Recu[] = []

beforeAll(async () => {
  serveur = createServer((requete, reponse) => {
    const morceaux: Buffer[] = []
    requete.on('data', m => morceaux.push(m as Buffer))
    requete.on('end', () => {
      try {
        recus.push({
          entetes: requete.headers,
          corps: JSON.parse(Buffer.concat(morceaux).toString('utf8')),
        })
      }
      catch {
        recus.push({ entetes: requete.headers, corps: {} })
      }
      reponse.writeHead(200, { 'content-type': 'application/json' })
      reponse.end('{"recu":true,"doublon":false}')
    })
  })

  await new Promise<void>((tenu) => { serveur.listen(0, '127.0.0.1', tenu) })
  const a = serveur.address()
  adresse = `http://127.0.0.1:${typeof a === 'object' && a !== null ? a.port : 0}/hooks/claude-code`
})

afterAll(async () => {
  await new Promise<void>((tenu) => { serveur.close(() => tenu()) })
})

beforeEach(() => {
  recus = []
})

/** Lance le script avec cette entrée, et rend quand il a terminé. */
function lancer(entree: Record<string, unknown>, options: { secret?: string | null } = {}): Promise<void> {
  return new Promise((tenu, rompu) => {
    const environnement: Record<string, string> = {
      ...process.env as Record<string, string>,
      CAIRN_HOOKS_URL: adresse,
    }

    const secret = options.secret === undefined ? SECRET : options.secret
    if (secret === null) delete environnement.CAIRN_HOOKS_SECRET
    else environnement.CAIRN_HOOKS_SECRET = secret

    const enfant = spawn(process.execPath, [SCRIPT], { env: environnement, stdio: ['pipe', 'ignore', 'ignore'] })
    enfant.on('error', rompu)
    enfant.on('close', () => tenu())
    enfant.stdin.end(JSON.stringify(entree))
  })
}

function usageOutil(modifications: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    session_id: 'session-1',
    cwd: RACINE,
    hook_event_name: 'PostToolUse',
    tool_name: 'Write',
    tool_use_id: 'toolu_01ABC',
    ...modifications,
  }
}

describe('ce qui quitte le poste', () => {
  it('porte le secret, et rien que les huit champs de la liste blanche', async () => {
    await lancer(usageOutil())

    expect(recus).toHaveLength(1)
    expect(recus[0]?.entetes['x-cairn-hooks-secret']).toBe(SECRET)
    expect(Object.keys(recus[0]?.corps ?? {}).sort()).toEqual(
      ['agent', 'cle', 'depot', 'evenement', 'horodatage', 'motif', 'outil', 'session'].sort(),
    )
    expect(recus[0]?.corps.depot).toBe('cairn-dashboard')
  })

  it('ne laisse sortir ni commande, ni demande, ni contenu de fichier', async () => {
    // Le cœur de la fiche 0008 : ces champs existent vraiment dans une charge de
    // hook, et le texte s'y cache jusqu'à deux niveaux de profondeur.
    await lancer(usageOutil({
      tool_input: { file_path: '/home/lahay/secret.txt', content: 'MOT-DE-PASSE' },
      tool_response: { filePath: '/home/lahay/secret.txt' },
      prompt: 'TEXTE-DE-LA-DEMANDE',
      transcript_path: '/home/lahay/.claude/projects/x/transcript.jsonl',
      last_assistant_message: 'TEXTE-DE-LA-REPONSE',
      background_tasks: [{ id: 't', type: 'shell', command: 'rm -rf /' }],
      session_crons: [{ id: 'c', schedule: '* * * * *', prompt: 'TEXTE-DU-CRON' }],
    }))

    expect(recus).toHaveLength(1)
    const brut = JSON.stringify(recus[0]?.corps)
    for (const interdit of ['MOT-DE-PASSE', 'TEXTE-DE-LA-DEMANDE', 'TEXTE-DE-LA-REPONSE', 'rm -rf', 'TEXTE-DU-CRON', 'transcript']) {
      expect(brut).not.toContain(interdit)
    }
  })

  it('tire la clé de l\'identifiant d\'appel quand il existe', async () => {
    await lancer(usageOutil())
    expect(recus[0]?.corps.cle).toBe('claude-code:toolu_01ABC')
  })
})

describe('ce qui n\'en sort pas', () => {
  it('se tait sur un outil qui ne modifie rien', async () => {
    await lancer(usageOutil({ tool_name: 'Read', tool_use_id: 'toolu_lecture' }))
    expect(recus).toHaveLength(0)
  })

  it('se tait sur un événement hors liste', async () => {
    await lancer(usageOutil({ hook_event_name: 'PreToolUse' }))
    expect(recus).toHaveLength(0)
  })

  it('se tait depuis un dépôt qui n\'est pas suivi', async () => {
    await lancer(usageOutil({ cwd: tmpdir() }))
    expect(recus).toHaveLength(0)
  })

  it('se tait quand aucun secret n\'est défini', async () => {
    await lancer(usageOutil(), { secret: null })
    expect(recus).toHaveLength(0)
  })

  it('se tait sur une entrée illisible, sans échouer', async () => {
    await new Promise<void>((tenu) => {
      const enfant = spawn(process.execPath, [SCRIPT], {
        env: { ...process.env as Record<string, string>, CAIRN_HOOKS_URL: adresse, CAIRN_HOOKS_SECRET: SECRET },
        stdio: ['pipe', 'ignore', 'ignore'],
      })
      enfant.on('close', (code) => {
        // Un hook ne doit jamais faire échouer une session : il sort toujours en 0.
        expect(code).toBe(0)
        tenu()
      })
      enfant.stdin.end('ceci n\'est pas du JSON')
    })
    expect(recus).toHaveLength(0)
  })
})

describe('deux événements distincts ne se confondent pas', () => {
  it('donne deux clés différentes à deux fins de réponse de la même session', async () => {
    // Le risque propre à cette source : les hooks ne renvoient jamais, donc une
    // clé trop grossière ferait perdre un événement réel (fiche 0009).
    const fin = { session_id: 'session-1', cwd: RACINE, hook_event_name: 'Stop' }
    await lancer(fin)
    await lancer(fin)

    expect(recus).toHaveLength(2)
    expect(recus[0]?.corps.cle).not.toBe(recus[1]?.corps.cle)
  })
})

describe('les motifs suivent l\'événement', () => {
  it('rapporte comment la session a commencé', async () => {
    await lancer({ session_id: 's', cwd: RACINE, hook_event_name: 'SessionStart', source: 'startup' })
    expect(recus[0]?.corps.motif).toBe('startup')
    expect(recus[0]?.corps.outil).toBeNull()
  })

  it('rapporte comment elle s\'est terminée', async () => {
    await lancer({ session_id: 's', cwd: RACINE, hook_event_name: 'SessionEnd', reason: 'clear' })
    expect(recus[0]?.corps.motif).toBe('clear')
  })

  it('rapporte le type d\'un sous-agent quand il y en a un', async () => {
    await lancer({ session_id: 's', cwd: RACINE, hook_event_name: 'Stop', agent_type: 'Explore' })
    expect(recus[0]?.corps.agent).toBe('Explore')
  })
})
