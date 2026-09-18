// Le point d'autorisation du connecteur — fiche 0011.
//
// Claude y envoie le navigateur de la personne. On vérifie la demande dans
// l'ordre que l'OAuth 2.1 impose : le client et l'URL de rappel d'abord — s'ils
// sont faux, on ne redirige nulle part —, puis le reste, dont l'erreur se
// renvoie au client. Une demande valable exige ensuite le compte autorisé :
// sans session, le parcours de connexion GitHub, puis retour ici. Enfin la
// demande est déposée, scellée, et la personne est menée au consentement.
import { rediriger, repondreTexte } from '../../utils/reponse'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const etat = etatConnecteur(config)
  if (etat !== 'ok') {
    repondreTexte(event, 503, `Connecteur MCP non configuré : ${etat}.`)
    return
  }

  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true })
  const params = Object.fromEntries(url.searchParams)
  const lecture = lireDemandeAutorisation(params, { clientId: String(config.mcpClientId), origine: url.origin })

  if (!lecture.ok) {
    if (!lecture.redirigeable) {
      repondreTexte(event, 400, `Demande d'autorisation refusée : ${lecture.description}.`)
      return
    }
    rediriger(event, urlDeRetour(URL_RAPPEL_CLAUDE, {
      error: lecture.erreur,
      error_description: lecture.description,
      state: params.state ?? null,
    }))
    return
  }

  // Le consentement est celui du compte autorisé, et de lui seul.
  const session = await lireSessionAutorisee(event)
  if (!session) {
    rediriger(event, `/auth/github?retour=${encodeURIComponent(url.pathname + url.search)}`)
    return
  }

  await deposerDemande(event, lecture.demande)
  rediriger(event, '/connecteur/consentement')
})
