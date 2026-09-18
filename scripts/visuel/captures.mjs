// Épreuve visuelle — CLAUDE.md, règle 7.
//
// Capture l'application et l'écran correspondant du design, aux mêmes largeurs
// et dans les deux thèmes, pour que l'écart se voie au lieu de se supposer.
// Les captures se joignent à l'entrée de journal de la tranche.
//
//   node scripts/visuel/captures.mjs --base http://127.0.0.1:3021 --sortie captures --etiquette avant
//
// Options :
//   --base        adresse de l'application déjà démarrée (défaut : http://127.0.0.1:3021)
//   --sortie      dossier des captures (défaut : captures/)
//   --etiquette   préfixe des captures de l'application : « avant », « apres »… (défaut : app)
//   --ecrans      écrans de l'application, « nom=chemin » séparés par des virgules
//                 (défaut : accueil=/). Exemple : accueil=/,tickets=/tickets
//   --sans-design ne capture pas l'export du design (utile pour un simple avant/après)
//
// Le design a deux vues, « tableau » et « documentation », toutes deux capturées.
// Les fichiers se nomment <etiquette>-<ecran>-<theme>-<largeur>.png et
// design-<vue>-<theme>-<largeur>.png.
//
// Variables attendues : NUXT_SESSION_PASSWORD et NUXT_ALLOWED_GITHUB_ID, ceux du
// serveur visé. La session est scellée ici, comme le ferait le serveur, pour
// capturer l'application connectée : aucun identifiant OAuth n'est nécessaire, et
// aucun secret de production n'est requis ni écrit. Contre `npm run dev:fictif`,
// il suffit de lancer celui-ci avec NUXT_SESSION_PASSWORD posé (fiche 0010).
//
// Si le navigateur refuse de démarrer faute de bibliothèques système, deux voies :
// `npx playwright install-deps chromium` (demande les droits administrateur), ou
// extraire libnspr4, libnss3 et libasound2t64 (`apt-get download`, `dpkg-deb -x`)
// dans un dossier et les fournir par LD_LIBRARY_PATH.
import { mkdir } from 'node:fs/promises'
import { webcrypto } from 'node:crypto'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { seal, defaults } from 'iron-webcrypto'

const FORMATS = [
  { nom: '1440', largeur: 1440, hauteur: 900 },
  { nom: '390', largeur: 390, hauteur: 844 },
]

const THEMES = [
  { nom: 'sombre', valeur: 'dark', infobulle: 'Sombre' },
  { nom: 'clair', valeur: 'light', infobulle: 'Clair' },
]

/** Les vues du design, et l'entrée du rail qui y mène. */
const VUES_DESIGN = [
  { nom: 'tableau', infobulle: 'Vue d\'ensemble' },
  { nom: 'documentation', infobulle: 'Documentation' },
]

const DESIGN = resolve(import.meta.dirname, '../../design/cairn-design-system.html')

function option(nom, defaut) {
  const i = process.argv.indexOf(`--${nom}`)
  return i === -1 ? defaut : process.argv[i + 1]
}

const base = option('base', 'http://127.0.0.1:3021').replace(/\/$/, '')
const sortie = resolve(option('sortie', 'captures'))
const etiquette = option('etiquette', 'app')
const avecDesign = !process.argv.includes('--sans-design')
const ecrans = option('ecrans', 'accueil=/').split(',').map((paire) => {
  const [nom, chemin] = paire.split('=')
  if (!nom || !chemin) throw new Error(`écran mal formé : « ${paire} », attendu nom=chemin`)
  return { nom, chemin }
})

// Scelle une session comme le serveur le ferait : l'épreuve porte sur l'écran
// connecté, celui que le compte autorisé voit réellement.
async function forgerSession() {
  const motDePasse = process.env.NUXT_SESSION_PASSWORD
  const id = Number(process.env.NUXT_ALLOWED_GITHUB_ID)
  if (!motDePasse || !Number.isFinite(id)) {
    throw new Error('NUXT_SESSION_PASSWORD et NUXT_ALLOWED_GITHUB_ID sont attendus, ceux du serveur visé')
  }
  return seal(
    webcrypto,
    { id: `visuel-${id}`, createdAt: Date.now(), data: { id, login: 'compte-autorise' } },
    motDePasse,
    { ...defaults, ttl: 12 * 3600 * 1000 },
  )
}

async function capturerApplication(navigateur, session) {
  for (const ecran of ecrans) {
    for (const theme of THEMES) {
      for (const format of FORMATS) {
        const contexte = await navigateur.newContext({
          viewport: { width: format.largeur, height: format.hauteur },
        })
        await contexte.addCookies([{ name: 'cairn_session', value: session, url: base }])
        // Le thème vit dans le stockage du visiteur : on le pose avant le premier rendu.
        await contexte.addInitScript((valeur) => {
          try {
            localStorage.setItem('cairn-theme', valeur)
          }
          catch {
            // Stockage refusé : la page retombera sur le thème du système.
          }
        }, theme.valeur)

        const page = await contexte.newPage()
        const reponse = await page.goto(`${base}${ecran.chemin}`, { waitUntil: 'networkidle' })
        if (!reponse?.ok()) {
          throw new Error(`${ecran.chemin} a répondu ${reponse?.status()} — session ou serveur en cause`)
        }

        const applique = await page.evaluate(() => document.documentElement.dataset.theme)
        if (applique !== theme.valeur) {
          throw new Error(`thème ${theme.valeur} demandé, ${applique} appliqué`)
        }

        const chemin = `${sortie}/${etiquette}-${ecran.nom}-${theme.nom}-${format.nom}.png`
        await page.screenshot({ path: chemin, fullPage: format.nom === '390' })
        console.log(`   ${chemin}`)
        await contexte.close()
      }
    }
  }
}

async function capturerDesign(navigateur) {
  const page = await navigateur.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(`file://${DESIGN}`, { waitUntil: 'load', timeout: 60000 })
  await page.waitForTimeout(3000)

  for (const vue of VUES_DESIGN) {
    const entree = page.locator(`[title="${vue.infobulle}"]`)
    if (await entree.count()) {
      await entree.first().click()
      await page.waitForTimeout(700)
    }
    for (const theme of THEMES) {
      const bouton = page.locator(`[title="${theme.infobulle}"]`)
      if (await bouton.count()) {
        await bouton.first().click()
        await page.waitForTimeout(700)
      }
      for (const format of FORMATS) {
        await page.setViewportSize({ width: format.largeur, height: format.hauteur })
        await page.waitForTimeout(500)
        const chemin = `${sortie}/design-${vue.nom}-${theme.nom}-${format.nom}.png`
        await page.screenshot({ path: chemin, fullPage: format.nom === '390' })
        console.log(`   ${chemin}`)
      }
    }
  }
  await page.close()
}

const session = await forgerSession()
await mkdir(sortie, { recursive: true })

let navigateur
try {
  navigateur = await chromium.launch()
}
catch (erreur) {
  console.error('le navigateur ne démarre pas — bibliothèques système manquantes ?')
  console.error(String(erreur.message).split('\n').slice(0, 4).join('\n'))
  process.exit(1)
}

try {
  console.log(`== application (${base})`)
  await capturerApplication(navigateur, session)
  if (avecDesign) {
    console.log('== design de référence')
    await capturerDesign(navigateur)
  }
}
finally {
  await navigateur.close()
}
