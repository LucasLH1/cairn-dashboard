// Le code HTTP dit à qui revient le problème : le visiteur ne doit pas croire
// qu'il s'est trompé quand c'est le dashboard qui n'arrive pas à lire.
import { describe, expect, it } from 'vitest'
import { codeHttpPour, MESSAGES } from '../server/utils/echec-doc'
import type { EchecDoc } from '../server/utils/doc-github'

const CAUSES: EchecDoc[] = ['non-configure', 'refuse', 'quota', 'absent', 'injoignable']

describe('le code HTTP distingue la demande fautive de l\'empêchement', () => {
  it('rend 404 pour un document qui n\'existe pas', () => {
    expect(codeHttpPour('absent')).toBe(404)
  })

  it('rend 503 quand le dashboard ne peut pas servir pour l\'instant', () => {
    expect(codeHttpPour('non-configure')).toBe(503)
    expect(codeHttpPour('quota')).toBe(503)
  })

  it('rend 502 quand GitHub refuse ou ne répond pas', () => {
    expect(codeHttpPour('refuse')).toBe(502)
    expect(codeHttpPour('injoignable')).toBe(502)
  })

  it('ne rend jamais 200 pour un échec', () => {
    for (const cause of CAUSES) {
      expect(codeHttpPour(cause)).toBeGreaterThanOrEqual(400)
    }
  })
})

describe('chaque cause a de quoi être expliquée à l\'écran', () => {
  it('couvre toutes les causes, sans en oublier', () => {
    expect(Object.keys(MESSAGES).sort()).toEqual([...CAUSES].sort())
  })

  it('donne un titre et un détail non vides', () => {
    for (const cause of CAUSES) {
      expect(MESSAGES[cause].titre.length).toBeGreaterThan(0)
      expect(MESSAGES[cause].detail.length).toBeGreaterThan(20)
    }
  })

  it('ne laisse fuir aucun jargon technique dans le détail', () => {
    for (const cause of CAUSES) {
      expect(MESSAGES[cause].detail).not.toMatch(/\b(401|403|404|502|503|HTTP|API)\b/)
    }
  })
})
