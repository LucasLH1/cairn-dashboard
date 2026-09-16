// L'historique est la seule donnée que le dashboard ne peut pas relire ailleurs :
// GitHub ne conserve pas les livraisons au-delà de quelques semaines. Ces tests
// éprouvent donc surtout ce qui protège cette donnée — le rejet des doublons, la
// purge, et la sonde qui doit distinguer « je peux lire » de « je peux écrire ».
import { beforeEach, describe, expect, it } from 'vitest'
import {
  compter,
  CONSERVATION_JOURS,
  derniers,
  enregistrer,
  migrer,
  ouvrir,
  purger,
  verifierBase,
} from '../server/utils/base'
import type { Base, Evenement } from '../server/utils/base'

function evenement(livraison: string, quand = '2026-09-16T12:00:00.000Z'): Evenement {
  return {
    livraison,
    source: 'github',
    type: 'push',
    action: null,
    depot: 'LucasLH1/cairn-wms',
    auteur: 'LucasLH1',
    titre: 'Un commit',
    url: 'https://github.com/LucasLH1/cairn-wms',
    recuLe: quand,
    charge: '{"ref":"refs/heads/dev"}',
  }
}

let db: Base

beforeEach(() => {
  db = ouvrir(':memory:')
  migrer(db)
})

describe('les migrations', () => {
  it('créent la base, sans cas « première fois » à part', () => {
    expect(compter(db)).toBe(0)
  })

  it('ne s\'appliquent qu\'une fois', () => {
    expect(migrer(db)).toBe(0)
  })

  it('sont rejouables sans effet sur les données', () => {
    enregistrer(db, evenement('a'))
    migrer(db)
    expect(compter(db)).toBe(1)
  })
})

describe('une livraison réémise n\'entre qu\'une fois', () => {
  it('enregistre la première', () => {
    expect(enregistrer(db, evenement('livraison-1'))).toBe('enregistre')
    expect(compter(db)).toBe(1)
  })

  it('constate la seconde sans écrire', () => {
    enregistrer(db, evenement('livraison-1'))
    expect(enregistrer(db, evenement('livraison-1'))).toBe('doublon')
    expect(compter(db)).toBe(1)
  })

  it('n\'écarte pas deux livraisons différentes au même instant', () => {
    enregistrer(db, evenement('a'))
    enregistrer(db, evenement('b'))
    expect(compter(db)).toBe(2)
  })

  it('c\'est la base qui garantit l\'unicité, pas le code', () => {
    // Écriture directe : la contrainte doit refuser, quoi que fasse l'appelant.
    enregistrer(db, evenement('unique'))
    expect(() => {
      db.prepare(`
        INSERT INTO evenements (livraison, source, type, recu_le, charge)
        VALUES ('unique', 'github', 'push', '2026-09-16T12:00:00.000Z', '{}')
      `).run()
    }).toThrow(/UNIQUE/)
  })
})

describe('la lecture du fil', () => {
  beforeEach(() => {
    enregistrer(db, { ...evenement('a', '2026-09-14T10:00:00.000Z'), type: 'push' })
    enregistrer(db, { ...evenement('b', '2026-09-15T10:00:00.000Z'), type: 'issues' })
    enregistrer(db, { ...evenement('c', '2026-09-16T10:00:00.000Z'), type: 'push' })
  })

  it('rend les événements du plus récent au plus ancien', () => {
    expect(derniers(db).map(e => e.livraison)).toEqual(['c', 'b', 'a'])
  })

  it('respecte la limite demandée', () => {
    expect(derniers(db, 2).map(e => e.livraison)).toEqual(['c', 'b'])
  })

  it('filtre par type', () => {
    expect(derniers(db, 50, 'push').map(e => e.livraison)).toEqual(['c', 'a'])
  })

  it('rend la charge telle qu\'elle a été reçue', () => {
    expect(derniers(db, 1)[0]?.charge).toBe('{"ref":"refs/heads/dev"}')
  })
})

describe('la purge', () => {
  it('conserve un an, comme la fiche 0007 le décide', () => {
    expect(CONSERVATION_JOURS).toBe(365)
  })

  it('efface ce qui dépasse la durée, et garde le reste', () => {
    enregistrer(db, evenement('vieux', '2024-01-01T00:00:00.000Z'))
    enregistrer(db, evenement('recent', '2026-09-16T00:00:00.000Z'))

    const efface = purger(db, new Date('2026-09-16T12:00:00.000Z'))
    expect(efface).toBe(1)
    expect(derniers(db).map(e => e.livraison)).toEqual(['recent'])
  })

  it('n\'efface rien quand tout est récent', () => {
    enregistrer(db, evenement('a', '2026-09-16T00:00:00.000Z'))
    expect(purger(db, new Date('2026-09-16T12:00:00.000Z'))).toBe(0)
  })

  it('garde un événement pile à la limite', () => {
    const limite = new Date('2026-09-16T12:00:00.000Z')
    const pile = new Date(limite.getTime() - CONSERVATION_JOURS * 24 * 3600 * 1000 + 1000).toISOString()
    enregistrer(db, evenement('pile', pile))
    expect(purger(db, limite)).toBe(0)
  })
})

describe('la sonde distingue lire et écrire', () => {
  it('dit « ok » sur une base saine', () => {
    expect(verifierBase(db)).toBe('ok')
  })

  it('ne laisse aucune trace de son écriture d\'épreuve', () => {
    verifierBase(db)
    verifierBase(db)
    expect(compter(db)).toBe(0)
  })

  it('dit « inaccessible » quand la table n\'existe pas', () => {
    const vide = ouvrir(':memory:')
    expect(verifierBase(vide)).toBe('inaccessible')
  })

  it('ne confond pas une base vide avec une base absente', () => {
    expect(compter(db)).toBe(0)
    expect(verifierBase(db)).toBe('ok')
  })
})
