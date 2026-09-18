// Les jetons de rafraîchissement en base — fiche 0011, migration 3.
// La rotation est le garde-fou : un jeton déjà tourné qui se représente
// révoque toute sa famille.
import { describe, expect, it } from 'vitest'
import {
  compterRafraichissements,
  conserverRafraichissement,
  migrer,
  ouvrir,
  purgerRafraichissements,
  tournerRafraichissement,
} from '../server/utils/base'

function base() {
  const db = ouvrir(':memory:')
  migrer(db)
  return db
}

function jeton(empreinte: string, famille = 'f1', expireLe = '2099-01-01T00:00:00.000Z') {
  return { empreinte, famille, client: 'claude', sujet: '68059501', portees: ['docs:read', 'docs:write'], creeLe: '2026-09-18T20:00:00.000Z', expireLe }
}

describe('la migration 3', () => {
  it('crée la table des jetons, sans toucher aux événements', () => {
    const db = base()
    const versions = (db.prepare('SELECT version FROM migrations ORDER BY version').all() as Array<{ version: number }>).map(l => l.version)
    expect(versions).toEqual([1, 2, 3])
    expect(compterRafraichissements(db)).toBe(0)
  })
})

describe('la rotation', () => {
  it('rend ce que le jeton portait, une fois, et le marque remplacé', () => {
    const db = base()
    conserverRafraichissement(db, jeton('e1'))
    const premiere = tournerRafraichissement(db, 'e1', new Date('2026-09-19T00:00:00.000Z'))
    expect(premiere).toEqual({ ok: true, jeton: jeton('e1') })
    expect(compterRafraichissements(db)).toBe(1)
  })

  it('révoque toute la famille quand un jeton déjà tourné se représente', () => {
    const db = base()
    conserverRafraichissement(db, jeton('e1', 'f1'))
    conserverRafraichissement(db, jeton('e2', 'f1'))
    conserverRafraichissement(db, jeton('autre', 'f2'))
    expect(tournerRafraichissement(db, 'e1').ok).toBe(true)
    expect(tournerRafraichissement(db, 'e1')).toEqual({ ok: false, raison: 'rejoue' })
    // e2, de la même famille, ne vaut plus ; l'autre famille est intacte.
    expect(tournerRafraichissement(db, 'e2')).toEqual({ ok: false, raison: 'inconnu' })
    expect(tournerRafraichissement(db, 'autre').ok).toBe(true)
  })

  it('refuse un jeton inconnu ou expiré', () => {
    const db = base()
    expect(tournerRafraichissement(db, 'jamais')).toEqual({ ok: false, raison: 'inconnu' })
    conserverRafraichissement(db, jeton('vieux', 'f1', '2026-01-01T00:00:00.000Z'))
    expect(tournerRafraichissement(db, 'vieux', new Date('2026-09-18T00:00:00.000Z'))).toEqual({ ok: false, raison: 'expire' })
    expect(compterRafraichissements(db)).toBe(0)
  })

  it('refuse deux fois la même empreinte à la conservation', () => {
    const db = base()
    conserverRafraichissement(db, jeton('e1'))
    expect(() => conserverRafraichissement(db, jeton('e1'))).toThrow(/UNIQUE/)
  })
})

describe('la purge', () => {
  it('efface les expirés, et rien d\'autre', () => {
    const db = base()
    conserverRafraichissement(db, jeton('vieux', 'f1', '2026-01-01T00:00:00.000Z'))
    conserverRafraichissement(db, jeton('jeune', 'f2', '2099-01-01T00:00:00.000Z'))
    expect(purgerRafraichissements(db, new Date('2026-09-18T00:00:00.000Z'))).toBe(1)
    expect(compterRafraichissements(db)).toBe(1)
  })
})
