// La décision de consentement — fiche 0011.
//
// Trois remparts avant qu'un code parte : l'origine de la soumission, qui doit
// être le dashboard lui-même (tranche 4) ; la session du compte autorisé ; la
// demande scellée, qui doit exister et n'a pas plus de dix minutes. Le code
// émis vit une minute, à usage unique, lié à tout ce que la demande portait.
import { rediriger, repondreTexte } from '../../utils/reponse'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (!origineAcceptable(getHeader(event, 'origin'), getHeader(event, 'host'))) {
    repondreTexte(event, 403, 'Origine de la soumission refusée.')
    return
  }

  const session = await lireSessionAutorisee(event)
  if (!session || typeof session.id !== 'number') {
    repondreTexte(event, 401, 'Connexion requise.')
    return
  }

  const demande = await lireDemande(event)
  await effacerDemande(event)
  if (!demande) {
    repondreTexte(event, 400, 'Aucune demande d\'autorisation en attente : recommencez depuis Claude.')
    return
  }

  const corps = await readBody<Record<string, unknown>>(event).catch(() => null)
  const decision = String(corps?.decision ?? '')

  if (decision !== 'accepter') {
    rediriger(event, urlDeRetour(demande.redirectUri, {
      error: 'access_denied',
      error_description: 'consentement refusé',
      state: demande.state,
    }))
    return
  }

  if (etatConnecteur(config) !== 'ok' || demande.clientId !== String(config.mcpClientId)) {
    repondreTexte(event, 503, 'Connecteur MCP non configuré.')
    return
  }

  const code = magasinCodes().emettre({
    clientId: demande.clientId,
    redirectUri: demande.redirectUri,
    codeChallenge: demande.codeChallenge,
    resource: demande.resource,
    portees: demande.portees,
    sujet: String(session.id),
  })

  rediriger(event, urlDeRetour(demande.redirectUri, { code, state: demande.state }))
})
