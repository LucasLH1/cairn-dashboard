// Le faux GitHub du développement local — fiche 0010.
//
// Il n'a de valeur que s'il répond comme GitHub **pour ce que le dashboard lit**.
// On le passe donc au crible des vrais clients et des vrais analyseurs : si l'un
// d'eux évolue, ou si les données fictives s'écartent du format de cairn-wms,
// l'écart se voit ici plutôt qu'à l'écran.
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { demarrerFauxGithub } from '../scripts/dev/faux-github.mjs'
import { lireEvenements } from '../scripts/dev/fil.mjs'
import { analyserAvancement, ErreurAvancement, ETATS } from '../server/utils/avancement'
import { creerClient, interpreterErreur, organiserArbre, viderCaches } from '../server/utils/doc-github'
import { lireMessage } from '../server/utils/hooks'
import { analyserEntree, estUneEntree, RACINE as JOURNAL } from '../server/utils/journal-wms'
import { echangerCode, lireUtilisateur, urlAutorisation } from '../server/utils/oauth-github'
import { construireOrganisation } from '../server/utils/organisation'
import { verifierJetonGithub } from '../server/utils/sante-github'
import { creerClientTickets, viderCachesTickets } from '../server/utils/tickets-github'
import { evenementRetenu, resumer } from '../server/utils/webhook'

const ID = 4242
const DEPOT = 'fictif/cairn-wms'
const RAPPEL = 'http://localhost:3000/auth/github'

interface Faux {
  url: string
  choisir: (scenario: string) => void
  fermer: () => Promise<void>
}

let faux: Faux

const lecteur = () => creerClient('fictif', DEPOT, 'dev', faux.url)
const tickets = () => creerClientTickets('fictif', DEPOT, undefined, faux.url)

beforeAll(async () => {
  faux = await demarrerFauxGithub({ idAutorise: ID })
})

afterAll(() => faux.fermer())

beforeEach(() => {
  faux.choisir('nominal')
  viderCaches()
  viderCachesTickets()
})

describe('le dépôt fictif, lu comme celui de cairn-wms', () => {
  it('sert un suivi lisible, qui parcourt les quatre états, et dont chaque document existe', async () => {
    const avancement = analyserAvancement(await lecteur().brut('status.yml'))
    const modules = avancement.couches.flatMap(c => c.modules)

    expect(modules.every(m => m.etat !== null)).toBe(true)
    expect(new Set(modules.map(m => m.etat))).toEqual(new Set(ETATS))

    for (const m of modules.filter(m => m.doc !== null)) {
      expect((await lecteur().fichier(m.doc as string)).length, m.doc as string).toBeGreaterThan(0)
    }
  })

  it('sert une arborescence que le dashboard range en documentation', async () => {
    const groupes = organiserArbre(await lecteur().arbre())
    expect(groupes[0]?.dossier).toBeNull()
    expect(groupes.flatMap(g => g.documents).length).toBeGreaterThan(5)
  })

  it('sert un journal dont chaque entrée porte un en-tête lu, et un README qui n\'en est pas une', async () => {
    const noms = (await lecteur().arbre())
      .filter(e => e.type === 'blob' && e.path.startsWith(`${JOURNAL}/`))
      .map(e => e.path.slice(JOURNAL.length + 1))

    expect(noms).toContain('README.md')
    const entrees = noms.filter(estUneEntree)
    expect(entrees.length).toBeGreaterThan(3)

    for (const nom of entrees) {
      const entree = analyserEntree(await lecteur().brut(`${JOURNAL}/${nom}`), nom)
      expect(entree.objectif, nom).not.toBeNull()
      expect(entree.date, nom).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
    }
  })

  it('répond 304 à une requête conditionnelle, comme GitHub', async () => {
    const premiere = await fetch(`${faux.url}/repos/${DEPOT}/contents/status.yml`)
    const seconde = await fetch(`${faux.url}/repos/${DEPOT}/contents/status.yml`, {
      headers: { 'if-none-match': premiere.headers.get('etag') ?? '' },
    })
    expect(seconde.status).toBe(304)
  })
})

describe('les tickets fictifs', () => {
  it('se raccordent tous : chaque module à son label, chaque couche à son jalon', async () => {
    const avancement = analyserAvancement(await lecteur().brut('status.yml'))
    const organisation = construireOrganisation(avancement, await tickets().labels(), await tickets().jalons())

    for (const couche of organisation.couches) {
      expect(couche.label, couche.id).not.toBeNull()
      expect(couche.jalonNumero, couche.id).not.toBeNull()
    }
    expect(organisation.couches.flatMap(c => c.modules).length)
      .toBe(avancement.couches.flatMap(c => c.modules).length)
  })

  it('écartent les pull requests, que l\'API mêle aux issues', async () => {
    const reference = JSON.parse(readFileSync('scripts/dev/donnees/tickets.json', 'utf8')) as {
      tickets: Array<{ numero: number, pull_request?: boolean }>
    }
    const pulls = reference.tickets.filter(t => t.pull_request).map(t => t.numero)
    expect(pulls.length).toBeGreaterThan(0)

    const numeros = (await tickets().tickets()).map(t => t.numero)
    expect(numeros.some(n => pulls.includes(n))).toBe(false)
  })

  it('s\'enrichissent d\'un ticket créé, en mémoire, qui apparaît en tête', async () => {
    const cree = await tickets().creer({ titre: 'Essai', corps: '', labels: ['bug'] }, 2)
    const liste = await tickets().tickets()
    expect(liste[0]?.numero).toBe(cree.numero)
    expect(liste[0]?.labels).toEqual(['bug'])
  })
})

describe('la connexion fictive', () => {
  it('va jusqu\'au compte autorisé, par le vrai parcours OAuth', async () => {
    const aller = await fetch(urlAutorisation('fictif', RAPPEL, 'etat-1', faux.url), { redirect: 'manual' })
    expect(aller.status).toBe(302)

    const retour = new URL(aller.headers.get('location') ?? '')
    expect(`${retour.origin}${retour.pathname}`).toBe(RAPPEL)
    expect(retour.searchParams.get('state')).toBe('etat-1')

    const code = retour.searchParams.get('code') ?? ''
    const jeton = await echangerCode(fetch, { clientId: 'fictif', clientSecret: 'fictif', code, urlRappel: RAPPEL }, faux.url)
    expect(jeton).toBeTruthy()
    expect(await lireUtilisateur(fetch, jeton as string, faux.url)).toEqual({ id: ID, login: 'compte-fictif' })
  })
})

describe('les scénarios', () => {
  it.each([
    ['refus', 'refuse'],
    ['quota', 'quota'],
    ['injoignable', 'injoignable'],
  ])('« %s » rend l\'échec « %s », tel que le dashboard l\'interprète', async (scenario, attendu) => {
    faux.choisir(scenario)
    const erreur = await lecteur().brut('status.yml').catch((e: unknown) => e)
    expect(interpreterErreur(erreur)).toBe(attendu)
  })

  it('« illisible » rend un suivi que l\'analyse refuse', async () => {
    faux.choisir('illisible')
    const source = await lecteur().brut('status.yml')
    expect(() => analyserAvancement(source)).toThrow(ErreurAvancement)
  })

  it('« vide » rend un dépôt sans rien, que la sonde juge pourtant lisible', async () => {
    faux.choisir('vide')
    expect(analyserAvancement(await lecteur().brut('status.yml')).couches).toEqual([])
    expect(organiserArbre(await lecteur().arbre())).toEqual([])
    expect(await tickets().tickets()).toEqual([])
    expect(await verifierJetonGithub('fictif', DEPOT, 2000, faux.url)).toBe('ok')
  })

  it('« refus » fait dire non à la sonde de /health', async () => {
    faux.choisir('refus')
    expect(await verifierJetonGithub('fictif', DEPOT, 2000, faux.url)).toBe('refuse')
  })
})

describe('les événements qui amorcent le fil', () => {
  it('sont tous de ceux que les routes de réception acceptent', () => {
    for (const e of lireEvenements()) {
      if (e.source === 'github') {
        expect(evenementRetenu(e.evenement), e.evenement).toBe(true)
        expect(resumer(e.evenement, e.charge).titre, e.evenement).not.toBeNull()
      }
      else {
        const lu = lireMessage({ ...e, cle: 'claude-code:essai', agent: null, horodatage: new Date().toISOString() })
        expect(lu.ok, `${e.evenement} ${e.depot}`).toBe(true)
      }
    }
  })
})
