// Parcours de connexion, en une seule route : l'OAuth App n'accepte qu'une URL
// de rappel. Sans code, on part chez GitHub ; avec code, on revient.
//
// La redirection est écrite sur la réponse en cours, et non renvoyée comme une
// réponse neuve : celle-ci repartirait sans les en-têtes déjà posés, donc sans
// le cookie d'état ni celui de session.
import { randomBytes, timingSafeEqual } from 'node:crypto'

const NOM_COOKIE_ETAT = 'cairn_oauth_etat'

function rediriger(event: Parameters<typeof getRequestURL>[0], cible: string) {
  event.node.res.statusCode = 302
  event.node.res.setHeader('location', cible)
  event.node.res.setHeader('cache-control', 'no-store')
  event.node.res.end()
}

function memeEtat(a: string, b: string): boolean {
  const ta = Buffer.from(a)
  const tb = Buffer.from(b)
  return ta.length === tb.length && timingSafeEqual(ta, tb)
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Rien ne sert de partir chez GitHub si la session ne pourra pas être ouverte :
  // on refuse ici, franchement, plutôt que d'échouer au retour.
  const etat = etatConnexion(config)
  if (etat !== 'ok') {
    event.node.res.statusCode = 503
    event.node.res.setHeader('content-type', 'text/plain; charset=utf-8')
    event.node.res.setHeader('cache-control', 'no-store')
    event.node.res.end(`Connexion GitHub non configurée : ${etat}.`)
    return
  }

  const clientId = config.oauth.github.clientId
  const clientSecret = config.oauth.github.clientSecret

  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true })
  const urlRappel = `${url.origin}/auth/github`
  const code = url.searchParams.get('code')
  const etatRecu = url.searchParams.get('state')

  // Aller : on fabrique un état, on le dépose, et on part chez GitHub.
  if (!code) {
    const jeton = randomBytes(24).toString('hex')
    setCookie(event, NOM_COOKIE_ETAT, jeton, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 600,
    })
    rediriger(event, urlAutorisation(clientId, urlRappel, jeton))
    return
  }

  // Retour : l'état doit correspondre à celui déposé, sinon on refuse.
  const etatDepose = getCookie(event, NOM_COOKIE_ETAT)
  deleteCookie(event, NOM_COOKIE_ETAT, { path: '/' })
  if (!etatDepose || !etatRecu || !memeEtat(etatDepose, etatRecu)) {
    rediriger(event, '/connexion?erreur=etat')
    return
  }

  const jetonAcces = await echangerCode(globalThis.fetch, { clientId, clientSecret, code, urlRappel })
  if (!jetonAcces) {
    rediriger(event, '/connexion?erreur=jeton')
    return
  }

  const utilisateur = await lireUtilisateur(globalThis.fetch, jetonAcces)
  if (!utilisateur) {
    rediriger(event, '/connexion?erreur=identite')
    return
  }

  // Le contrôle porte sur l'identifiant numérique, jamais sur le login.
  if (!estAutorise(utilisateur.id, config.allowedGithubId)) {
    rediriger(event, '/refus')
    return
  }

  await ouvrirSession(event, utilisateur)
  rediriger(event, '/')
})
