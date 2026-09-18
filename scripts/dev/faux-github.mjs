// Faux GitHub du poste — fiche 0010.
//
// Répond, à partir de données fictives, aux seuls appels que le dashboard fait à
// GitHub : la liste est dans la fiche. Il n'écoute que sur 127.0.0.1 et ne garde
// rien : un ticket créé vit en mémoire, jusqu'à l'arrêt.
//
// La forme des réponses est celle de l'API réelle pour les champs que le
// dashboard lit, et pas davantage. Un champ lu demain devra être ajouté ici ;
// test/faux-github.spec.ts le verrait manquer.
//
// Les scénarios rendent à la demande les états que l'interface doit savoir
// montrer. Ils se choisissent au lancement, ou à chaud depuis /_scenario ; le
// cache du dashboard les laisse apparaître en trente secondes au plus.
import { createHash, randomBytes } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'

export const SCENARIOS = {
  nominal: 'les données fictives, complètes',
  vide: 'un dépôt sans documentation, sans journal, sans ticket, et un suivi sans couche',
  refus: 'GitHub refuse le jeton (401)',
  quota: 'le quota de GitHub est épuisé (403, x-ratelimit-remaining à 0)',
  injoignable: 'GitHub ne répond pas : la connexion est coupée',
  illisible: 'le status.yml n\'est pas du YAML valide',
}

const DONNEES = join(import.meta.dirname, 'donnees')

const SUIVI_VIDE = `projet: Cairn WMS — données fictives
mis_a_jour_le: 2026-09-18

couches: []
`

const SUIVI_ILLISIBLE = `projet: Cairn WMS — données fictives
couches:
  - id: 0
    nom: [ceci n'est pas du YAML
`

/** Les fichiers du dépôt fictif, par chemin relatif : `docs/README.md` → contenu. */
function lireDepot(racine, prefixe = '') {
  const fichiers = new Map()
  for (const entree of readdirSync(join(racine, prefixe), { withFileTypes: true })) {
    const chemin = prefixe ? `${prefixe}/${entree.name}` : entree.name
    if (entree.isDirectory()) {
      for (const [c, v] of lireDepot(racine, chemin)) fichiers.set(c, v)
    }
    else {
      fichiers.set(chemin, readFileSync(join(racine, chemin)))
    }
  }
  return fichiers
}

function empreinte(contenu) {
  return createHash('sha1').update(contenu).digest('hex')
}

/** Les dossiers qui contiennent ces fichiers, comme l'arbre de GitHub les liste. */
function dossiersDe(chemins) {
  const dossiers = new Set()
  for (const chemin of chemins) {
    const parties = chemin.split('/')
    for (let i = 1; i < parties.length; i++) dossiers.add(parties.slice(0, i).join('/'))
  }
  return [...dossiers]
}

/**
 * Démarre le faux GitHub.
 *
 * @param {{ idAutorise: number, login?: string, scenario?: string, port?: number }} options
 */
export async function demarrerFauxGithub({ idAutorise, login = 'compte-fictif', scenario = 'nominal', port = 0 }) {
  if (!(scenario in SCENARIOS)) throw new Error(`scénario inconnu : ${scenario}`)

  const depot = lireDepot(join(DONNEES, 'depot'))
  const reference = JSON.parse(readFileSync(join(DONNEES, 'tickets.json'), 'utf8'))
  const etat = { scenario, crees: [] }

  /** Les fichiers servis, selon le scénario. */
  function fichiers() {
    if (etat.scenario === 'vide') return new Map([['status.yml', Buffer.from(SUIVI_VIDE)]])
    if (etat.scenario === 'illisible') return new Map([...depot, ['status.yml', Buffer.from(SUIVI_ILLISIBLE)]])
    return depot
  }

  function tickets(proprietaire, nom) {
    if (etat.scenario === 'vide') return []
    const jalons = new Map(reference.jalons.map(j => [j.titre, j.numero]))
    const lus = reference.tickets.map(t => ({
      id: 100000 + t.numero,
      number: t.numero,
      title: t.titre,
      state: t.etat,
      labels: t.labels.map(l => ({ name: l, color: couleur(l) })),
      comments: t.commentaires ?? 0,
      created_at: t.cree_le,
      updated_at: t.cree_le,
      html_url: `https://github.com/${proprietaire}/${nom}/${t.pull_request ? 'pull' : 'issues'}/${t.numero}`,
      user: { login },
      milestone: t.jalon ? { number: jalons.get(t.jalon), title: t.jalon } : null,
      // L'API des issues mêle les pull requests aux issues : le dashboard doit
      // savoir les écarter, alors le faux en sert une.
      ...(t.pull_request ? { pull_request: { url: `https://api.github.com/repos/${proprietaire}/${nom}/pulls/${t.numero}` } } : {}),
    }))
    return [...etat.crees, ...lus].sort((a, b) => b.created_at.localeCompare(a.created_at))
  }

  function couleur(nom) {
    return reference.labels.find(l => l.name === nom)?.color ?? 'ededed'
  }

  function repondre(req, res, statut, corps, entetes = {}) {
    const texte = JSON.stringify(corps)
    const etag = `W/"${empreinte(texte)}"`
    const communs = {
      'content-type': 'application/json; charset=utf-8',
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '4999',
      'x-ratelimit-used': '1',
      ...entetes,
    }
    // Requête conditionnelle, comme chez GitHub : le cache du dashboard reçoit
    // ses 304, et le chemin qu'il emprunte en production est éprouvé ici aussi.
    if (statut === 200 && req.headers['if-none-match'] === etag) {
      res.writeHead(304, { ...communs, etag })
      res.end()
      return
    }
    res.writeHead(statut, statut === 200 ? { ...communs, etag } : communs)
    res.end(texte)
  }

  async function lireCorps(req) {
    const morceaux = []
    for await (const m of req) morceaux.push(m)
    const texte = Buffer.concat(morceaux).toString('utf8')
    if (texte === '') return {}
    // Le dashboard poste du JSON ; un formulaire ne l'est pas, et GitHub accepte les deux.
    try {
      return JSON.parse(texte)
    }
    catch {
      return Object.fromEntries(new URLSearchParams(texte))
    }
  }

  function pageScenarios(res) {
    const liens = Object.entries(SCENARIOS).map(([nom, sens]) =>
      `<li><a href="/_scenario?nom=${nom}">${nom === etat.scenario ? `<strong>${nom}</strong>` : nom}</a> — ${sens}</li>`,
    ).join('\n')
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(`<!doctype html><meta charset="utf-8"><title>Faux GitHub</title>
<h1>Faux GitHub — scénario : ${etat.scenario}</h1>
<ul>${liens}</ul>
<p>Le dashboard garde ses lectures trente secondes : un changement s'y voit au plus tard après ce délai.</p>`)
  }

  async function traiter(req, res) {
    const url = new URL(req.url ?? '/', 'http://faux-github')
    const chemin = url.pathname

    // --- Pilotage du faux ---------------------------------------------------
    if (chemin === '/_scenario') {
      const demande = url.searchParams.get('nom')
      if (demande !== null) {
        if (!(demande in SCENARIOS)) return repondre(req, res, 422, { message: `scénario inconnu : ${demande}` })
        etat.scenario = demande
        console.log(`[faux GitHub] scénario : ${demande}`)
      }
      return pageScenarios(res)
    }

    // --- Connexion : GitHub accepte aussitôt, sans écran ---------------------
    if (chemin === '/login/oauth/authorize') {
      const retour = new URL(url.searchParams.get('redirect_uri') ?? '')
      retour.searchParams.set('code', `fictif-${randomBytes(8).toString('hex')}`)
      retour.searchParams.set('state', url.searchParams.get('state') ?? '')
      res.writeHead(302, { location: retour.toString() })
      return res.end()
    }
    if (chemin === '/login/oauth/access_token' && req.method === 'POST') {
      const corps = await lireCorps(req)
      if (!corps.code) return repondre(req, res, 200, { error: 'bad_verification_code' })
      return repondre(req, res, 200, { access_token: `fictif-${randomBytes(12).toString('hex')}`, token_type: 'bearer', scope: '' })
    }
    if (chemin === '/user') {
      if (!req.headers.authorization) return repondre(req, res, 401, { message: 'Requires authentication' })
      return repondre(req, res, 200, { id: idAutorise, login, name: 'Compte fictif' })
    }

    // --- Le dépôt -------------------------------------------------------------
    const trouve = /^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/.exec(chemin)
    if (!trouve) return repondre(req, res, 404, { message: 'Not Found' })
    const [, proprietaire, nom, reste = ''] = trouve

    if (etat.scenario === 'injoignable') {
      req.socket.destroy()
      return
    }
    if (etat.scenario === 'refus') {
      return repondre(req, res, 401, { message: 'Bad credentials' })
    }
    if (etat.scenario === 'quota') {
      return repondre(req, res, 403, { message: 'API rate limit exceeded' }, { 'x-ratelimit-remaining': '0', 'x-ratelimit-used': '5000' })
    }

    if (reste === '' || reste === '/') {
      return repondre(req, res, 200, { id: 1, name: nom, full_name: `${proprietaire}/${nom}`, private: true, default_branch: 'dev' })
    }

    if (reste.startsWith('/git/trees/')) {
      const tous = fichiers()
      const arbre = [
        ...dossiersDe([...tous.keys()]).map(p => ({ path: p, mode: '040000', type: 'tree', sha: empreinte(p) })),
        ...[...tous].map(([p, c]) => ({ path: p, mode: '100644', type: 'blob', sha: empreinte(c), size: c.length })),
      ].sort((a, b) => a.path.localeCompare(b.path))
      return repondre(req, res, 200, { sha: empreinte('arbre'), truncated: false, tree: arbre })
    }

    if (reste.startsWith('/contents/')) {
      const demande = decodeURIComponent(reste.slice('/contents/'.length)).replace(/\/$/, '')
      const tous = fichiers()
      const contenu = tous.get(demande)
      if (contenu) {
        return repondre(req, res, 200, {
          type: 'file',
          encoding: 'base64',
          name: demande.split('/').pop(),
          path: demande,
          size: contenu.length,
          sha: empreinte(contenu),
          content: contenu.toString('base64'),
        })
      }
      const enfants = [...tous.keys()].filter(p => p.startsWith(`${demande}/`))
      if (enfants.length > 0) {
        const noms = new Set(enfants.map(p => p.slice(demande.length + 1).split('/')[0]))
        return repondre(req, res, 200, [...noms].map(n => ({
          type: tous.has(`${demande}/${n}`) ? 'file' : 'dir',
          name: n,
          path: `${demande}/${n}`,
        })))
      }
      return repondre(req, res, 404, { message: 'Not Found' })
    }

    if (reste === '/labels') {
      return repondre(req, res, 200, etat.scenario === 'vide' ? [] : reference.labels)
    }

    if (reste === '/milestones') {
      return repondre(req, res, 200, etat.scenario === 'vide'
        ? []
        : reference.jalons.map(j => ({ number: j.numero, title: j.titre, state: 'open' })))
    }

    if (reste === '/issues' && req.method === 'POST') {
      const corps = await lireCorps(req)
      if (typeof corps.title !== 'string' || corps.title.trim() === '') {
        return repondre(req, res, 422, { message: 'Validation Failed' })
      }
      const existants = tickets(proprietaire, nom)
      const numero = Math.max(0, ...existants.map(t => t.number)) + 1
      const jalon = reference.jalons.find(j => j.numero === corps.milestone)
      const cree = {
        id: 100000 + numero,
        number: numero,
        title: corps.title,
        state: 'open',
        labels: (corps.labels ?? []).map(l => ({ name: l, color: couleur(l) })),
        comments: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        html_url: `https://github.com/${proprietaire}/${nom}/issues/${numero}`,
        user: { login },
        milestone: jalon ? { number: jalon.numero, title: jalon.titre } : null,
      }
      etat.crees.unshift(cree)
      console.log(`[faux GitHub] ticket #${numero} créé, en mémoire : ${corps.title}`)
      return repondre(req, res, 201, cree)
    }

    if (reste === '/issues') {
      return repondre(req, res, 200, tickets(proprietaire, nom))
    }

    return repondre(req, res, 404, { message: 'Not Found' })
  }

  const serveur = createServer((req, res) => {
    traiter(req, res).catch((erreur) => {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
      res.end(String(erreur))
    })
  })

  await new Promise((ok, echec) => {
    serveur.once('error', echec)
    serveur.listen(port, '127.0.0.1', ok)
  })

  const adresse = serveur.address()
  return {
    url: `http://127.0.0.1:${adresse.port}`,
    port: adresse.port,
    get scenario() {
      return etat.scenario
    },
    choisir(nom) {
      if (!(nom in SCENARIOS)) throw new Error(`scénario inconnu : ${nom}`)
      etat.scenario = nom
    },
    fermer() {
      serveur.closeAllConnections()
      return new Promise(ok => serveur.close(() => ok()))
    },
  }
}
