// Ce que l'écran de consentement montre : le client, l'hôte où le code partira,
// les portées demandées. Rien d'autre ne sort de la demande scellée.
export default defineEventHandler(async (event) => {
  const demande = await lireDemande(event)
  if (!demande) return { echec: 'aucune' }

  return {
    client: demande.clientId,
    hote: new URL(demande.redirectUri).host,
    ressource: demande.resource,
    portees: demande.portees,
  }
})
