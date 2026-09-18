// Développement local sur données fictives — fiche 0010.
//
//   npm run dev:fictif                        scénario nominal
//   npm run dev:fictif -- --scenario quota    un état d'échec, dès le lancement
//   npm run dev:fictif -- --fil 20            un événement fictif de plus toutes les 20 s
//
// Options : --port (3000), --port-faux (3999), --scenario (nominal), --fil (0 : éteint).
//
// Pour l'épreuve visuelle (règle 7) : NUXT_SESSION_PASSWORD=… npm run dev:fictif, puis
// NUXT_SESSION_PASSWORD=… NUXT_ALLOWED_GITHUB_ID=4242 npm run visuel -- --base http://127.0.0.1:3000
//
// Lance le faux GitHub et `nuxt dev`, puis amorce le fil. **Aucune valeur à
// saisir** : les secrets sont tirés au hasard à chaque lancement et ne sont écrits
// nulle part — ils ne protègent qu'un faux. Un redémarrage demande donc de se
// reconnecter, en un clic.
//
// Rien ne part vers GitHub : le dashboard ne connaît que le faux, par des adresses
// qui n'existent qu'en développement (nuxt.config.ts, `$development`).
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { demarrerFauxGithub, SCENARIOS } from './faux-github.mjs'
import { amorcer, lireEvenements, poster } from './fil.mjs'

const RACINE = resolve(import.meta.dirname, '../..')
const NUXT = resolve(RACINE, 'node_modules/nuxt/bin/nuxt.mjs')

// Base propre au mode fictif, hors suivi (.data/), repartie de zéro à chaque
// lancement : le fil n'y mêle jamais d'autres événements que ceux de fil.json.
const BASE_FICTIVE = resolve(RACINE, '.data/fictif.db')

/** Identifiant du compte fictif : celui que le faux GitHub rend, et le seul autorisé. */
const ID_FICTIF = 4242

function option(nom, defaut) {
  const i = process.argv.indexOf(`--${nom}`)
  return i === -1 ? defaut : process.argv[i + 1]
}

const port = Number(option('port', '3000'))
const portFaux = Number(option('port-faux', '3999'))
const scenario = option('scenario', 'nominal')
const cadence = Number(option('fil', '0'))

if (!(scenario in SCENARIOS)) {
  console.error(`Scénario inconnu : ${scenario}. Connus : ${Object.keys(SCENARIOS).join(', ')}.`)
  process.exit(1)
}

const hasard = octets => randomBytes(octets).toString('base64url')
const secrets = { webhook: hasard(24), hooks: hasard(24) }

for (const suffixe of ['', '-wal', '-shm']) rmSync(`${BASE_FICTIVE}${suffixe}`, { force: true })

let faux
try {
  faux = await demarrerFauxGithub({ idAutorise: ID_FICTIF, scenario, port: portFaux })
}
catch (erreur) {
  console.error(`Le faux GitHub ne démarre pas sur le port ${portFaux} : ${erreur.message}`)
  console.error('Un autre lancement tourne peut-être encore. Sinon : --port-faux <autre port>.')
  process.exit(1)
}

// L'API est appelée par le serveur, le parcours de connexion par le navigateur :
// `localhost` est l'adresse que le navigateur du poste atteint, WSL compris.
const webFaux = `http://localhost:${faux.port}`

const nuxt = spawn(process.execPath, [NUXT, 'dev', '--port', String(port)], {
  cwd: RACINE,
  stdio: 'inherit',
  env: {
    ...process.env,
    // `$development` n'est lu que si NODE_ENV vaut development (fiche 0010).
    NODE_ENV: 'development',
    NUXT_GITHUB_API_URL: faux.url,
    NUXT_GITHUB_WEB_URL: webFaux,
    NUXT_GITHUB_TOKEN: `fictif-${hasard(12)}`,
    NUXT_GITHUB_REPO: 'fictif/cairn-wms',
    NUXT_OAUTH_GITHUB_CLIENT_ID: 'fictif',
    NUXT_OAUTH_GITHUB_CLIENT_SECRET: hasard(24),
    // Fourni par l'environnement quand l'épreuve visuelle doit forger une session
    // (scripts/visuel/captures.mjs) ; tiré au hasard sinon.
    NUXT_SESSION_PASSWORD: process.env.NUXT_SESSION_PASSWORD || hasard(48),
    NUXT_ALLOWED_GITHUB_ID: String(ID_FICTIF),
    NUXT_BASE_FICHIER: BASE_FICTIVE,
    NUXT_WEBHOOK_SECRET: secrets.webhook,
    NUXT_HOOKS_SECRET: secrets.hooks,
    APP_COMMIT: 'fictif',
  },
})

let minuterie = null

async function arreter(code) {
  if (minuterie) clearInterval(minuterie)
  if (nuxt.exitCode === null) nuxt.kill('SIGTERM')
  await faux.fermer()
  process.exit(code)
}

process.on('SIGINT', () => arreter(0))
process.on('SIGTERM', () => arreter(0))
nuxt.on('exit', code => arreter(code ?? 0))

const base = `http://localhost:${port}`

async function attendre() {
  for (let essai = 0; essai < 120; essai++) {
    try {
      if ((await fetch(`${base}/live`)).ok) return
    }
    catch {
      // Pas encore prêt.
    }
    await new Promise(ok => setTimeout(ok, 1000))
  }
  throw new Error(`le dashboard ne répond pas sur ${base}/live`)
}

try {
  await attendre()
  const amorces = await amorcer(base, secrets)

  if (cadence > 0) {
    const evenements = lireEvenements()
    minuterie = setInterval(() => {
      const evenement = evenements[Math.floor(Math.random() * evenements.length)]
      poster(base, secrets, evenement, `direct-${Date.now()}`).catch(() => {})
    }, cadence * 1000)
  }

  console.log(`
────────────────────────────────────────────────────────────────
  Cairn Dashboard — données fictives (fiche 0010)

  Dashboard   ${base}
              « Se connecter » : un clic, rien à saisir.
  Scénario    ${scenario} — pour en changer : ${webFaux}/_scenario
  Fil         ${amorces} événements amorcés${cadence > 0 ? `, un de plus toutes les ${cadence} s` : ''}

  Rien ne part vers GitHub. Ctrl+C pour arrêter.
────────────────────────────────────────────────────────────────
`)
}
catch (erreur) {
  console.error(`\nÉchec du lancement : ${erreur.message}`)
  await arreter(1)
}
