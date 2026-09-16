// La route des hooks est la seconde porte publique du dashboard : une session
// Claude Code n'a pas de cookie. Ces tests éprouvent d'abord ce qui doit être
// refusé — et surtout ce que le message ne doit jamais laisser passer.
import { beforeEach, describe, expect, it } from 'vitest'
import {
  autoriserDebit,
  DEBIT_PAR_MINUTE,
  depotSuivi,
  evenementRetenu,
  EVENEMENTS_SESSION,
  LONGUEUR_MAXIMALE,
  lireMessage,
  secretValide,
  TAILLE_MAXIMALE,
  titrePour,
  viderDebit,
} from '../server/utils/hooks'

const SECRET = 'un-secret-de-hooks-pour-l-epreuve'

function message(modifications: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    cle: 'claude-code:abcdef',
    evenement: 'PostToolUse',
    session: 'session-1',
    depot: 'cairn-dashboard',
    outil: 'Write',
    motif: null,
    agent: null,
    horodatage: '2026-09-16T12:00:00.000Z',
    ...modifications,
  }
}

describe('le secret est comparé à temps constant', () => {
  it('accepte le bon secret', () => {
    expect(secretValide(SECRET, SECRET)).toBe(true)
  })

  it('refuse un autre secret de même longueur', () => {
    const autre = `${SECRET.slice(0, -1)}X`
    expect(secretValide(autre, SECRET)).toBe(false)
  })

  it('refuse un secret tronqué sans lever d\'erreur', () => {
    // Les longueurs diffèrent : la comparaison à temps constant l'exigerait.
    expect(secretValide('un-secret', SECRET)).toBe(false)
  })

  it('refuse un secret absent ou vide', () => {
    expect(secretValide(null, SECRET)).toBe(false)
    expect(secretValide('', SECRET)).toBe(false)
    expect(secretValide(undefined, SECRET)).toBe(false)
  })

  it('refuse tout quand aucun secret n\'est configuré', () => {
    expect(secretValide(SECRET, '')).toBe(false)
    expect(secretValide('', '')).toBe(false)
  })
})

describe('la liste des événements est fermée', () => {
  it('retient les quatre de la fiche 0008', () => {
    expect([...EVENEMENTS_SESSION]).toEqual(['SessionStart', 'SessionEnd', 'Stop', 'PostToolUse'])
  })

  it('refuse le reste, y compris ce qui existe mais n\'est pas retenu', () => {
    expect(evenementRetenu('PreToolUse')).toBe(false)
    expect(evenementRetenu('UserPromptSubmit')).toBe(false)
    expect(evenementRetenu('Notification')).toBe(false)
    expect(evenementRetenu('')).toBe(false)
    expect(evenementRetenu(undefined)).toBe(false)
  })
})

describe('seuls les deux dépôts suivis sont acceptés', () => {
  it('accepte les deux', () => {
    expect(depotSuivi('cairn-wms')).toBe(true)
    expect(depotSuivi('cairn-dashboard')).toBe(true)
  })

  it('refuse tout autre dépôt', () => {
    expect(depotSuivi('un-autre-projet')).toBe(false)
    expect(depotSuivi('')).toBe(false)
  })
})

describe('le message est reconstruit, jamais recopié', () => {
  it('lit un message conforme', () => {
    const lu = lireMessage(message())
    expect(lu.ok).toBe(true)
    if (lu.ok) {
      expect(lu.message.session).toBe('session-1')
      expect(lu.message.outil).toBe('Write')
    }
  })

  it('n\'emporte aucun champ qu\'il ne connaît pas', () => {
    // Le cœur de la fiche 0008 : une charge de hook porte le texte des
    // commandes et des demandes. Un champ inconnu ne doit jamais entrer.
    const lu = lireMessage(message({
      tool_input: { command: 'rm -rf /', content: 'secret' },
      prompt: 'le texte de la demande',
      transcript_path: '/home/lahay/.claude/projects/x/transcript.jsonl',
    }))

    expect(lu.ok).toBe(true)
    if (lu.ok) {
      expect(Object.keys(lu.message).sort()).toEqual(
        ['agent', 'cle', 'depot', 'evenement', 'horodatage', 'motif', 'outil', 'session'].sort(),
      )
      expect(JSON.stringify(lu.message)).not.toContain('rm -rf')
      expect(JSON.stringify(lu.message)).not.toContain('la demande')
    }
  })

  it('refuse un champ obligatoire manquant', () => {
    for (const champ of ['cle', 'session', 'depot', 'horodatage']) {
      const lu = lireMessage(message({ [champ]: undefined }))
      expect(lu.ok).toBe(false)
    }
  })

  it('refuse un horodatage qui n\'en est pas un', () => {
    const lu = lireMessage(message({ horodatage: 'hier matin' }))
    expect(lu).toEqual({ ok: false, refus: 'message-invalide' })
  })

  it('refuse un événement hors liste, et le dit', () => {
    expect(lireMessage(message({ evenement: 'PreToolUse' }))).toEqual({ ok: false, refus: 'evenement-inconnu' })
  })

  it('refuse un dépôt inconnu, et le dit', () => {
    expect(lireMessage(message({ depot: 'un-autre-projet' }))).toEqual({ ok: false, refus: 'depot-inconnu' })
  })

  it('refuse un champ trop long plutôt que de le tronquer', () => {
    const trop = 'x'.repeat(LONGUEUR_MAXIMALE + 1)
    expect(lireMessage(message({ session: trop })).ok).toBe(false)
    expect(lireMessage(message({ cle: trop })).ok).toBe(false)
    expect(lireMessage(message({ outil: trop })).ok).toBe(false)
    // Juste à la limite, en revanche, doit passer.
    expect(lireMessage(message({ session: 'x'.repeat(LONGUEUR_MAXIMALE) })).ok).toBe(true)
  })

  it('refuse ce qui n\'est pas un objet', () => {
    expect(lireMessage(null).ok).toBe(false)
    expect(lireMessage('une chaîne').ok).toBe(false)
    expect(lireMessage([message()]).ok).toBe(false)
  })

  it('accepte un champ facultatif absent, refuse un champ facultatif aberrant', () => {
    expect(lireMessage(message({ outil: undefined })).ok).toBe(true)
    expect(lireMessage(message({ outil: 42 })).ok).toBe(false)
  })
})

describe('le débit est borné', () => {
  beforeEach(viderDebit)

  it('laisse passer jusqu\'à la limite', () => {
    const t = Date.now()
    for (let i = 0; i < DEBIT_PAR_MINUTE; i += 1) {
      expect(autoriserDebit(t)).toBe(true)
    }
  })

  it('refuse au-delà', () => {
    const t = Date.now()
    for (let i = 0; i < DEBIT_PAR_MINUTE; i += 1) autoriserDebit(t)
    expect(autoriserDebit(t)).toBe(false)
  })

  it('rouvre quand la fenêtre a glissé', () => {
    const t = Date.now()
    for (let i = 0; i < DEBIT_PAR_MINUTE; i += 1) autoriserDebit(t)
    expect(autoriserDebit(t)).toBe(false)
    expect(autoriserDebit(t + 60_001)).toBe(true)
  })
})

describe('la taille est bornée bien en deçà de ce qu\'un message pèse', () => {
  it('borne à seize kilo-octets', () => {
    expect(TAILLE_MAXIMALE).toBe(16_000)
    expect(JSON.stringify(message()).length).toBeLessThan(TAILLE_MAXIMALE / 10)
  })
})

describe('le titre se construit des seules métadonnées reçues', () => {
  it('nomme l\'ouverture et la fin de session, avec leur motif', () => {
    const debut = lireMessage(message({ evenement: 'SessionStart', motif: 'startup', outil: null }))
    const fin = lireMessage(message({ evenement: 'SessionEnd', motif: 'clear', outil: null }))
    if (debut.ok) expect(titrePour(debut.message)).toBe('Session ouverte — startup')
    if (fin.ok) expect(titrePour(fin.message)).toBe('Session terminée — clear')
  })

  it('nomme la fin d\'une réponse', () => {
    const lu = lireMessage(message({ evenement: 'Stop', outil: null }))
    if (lu.ok) expect(titrePour(lu.message)).toBe('Réponse terminée')
  })

  it('nomme une modification de fichier par son outil', () => {
    const lu = lireMessage(message({ evenement: 'PostToolUse', outil: 'Edit' }))
    if (lu.ok) expect(titrePour(lu.message)).toBe('Fichier modifié — Edit')
  })

  it('ne devine rien quand l\'outil manque', () => {
    const lu = lireMessage(message({ evenement: 'PostToolUse', outil: null }))
    if (lu.ok) expect(titrePour(lu.message)).toBe('Fichier modifié')
  })
})
