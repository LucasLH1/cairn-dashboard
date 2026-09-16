// Le fil d'activité — tranche 5.
//
// L'historique conservé par le dashboard, sa seule donnée propre. Le navigateur
// le charge une fois, puis reçoit les nouveautés par le WebSocket : il n'y a
// pas de sondage.
import { compter, derniers } from '../../utils/base'
import { obtenirBase } from '../../utils/instance-base'
import { EVENEMENTS_SESSION } from '../../utils/hooks'
import { EVENEMENTS } from '../../utils/webhook'

/** Ce que le fil sait filtrer : les deux sources, dans un seul fil. */
const TYPES = [...EVENEMENTS, ...EVENEMENTS_SESSION] as readonly string[]

/** Bornes de ce qu'une page peut demander. */
const LIMITE_PAR_DEFAUT = 50
const LIMITE_MAXIMALE = 200

export default defineEventHandler((event) => {
  const requete = getQuery(event)

  const demandee = Number(requete.limite ?? LIMITE_PAR_DEFAUT)
  const limite = Number.isFinite(demandee)
    ? Math.min(Math.max(Math.trunc(demandee), 1), LIMITE_MAXIMALE)
    : LIMITE_PAR_DEFAUT

  const typeDemande = String(requete.type ?? '')
  const type = TYPES.includes(typeDemande) ? typeDemande : null

  try {
    const db = obtenirBase(useRuntimeConfig())
    return {
      evenements: derniers(db, limite, type),
      total: compter(db),
      types: [...EVENEMENTS],
    }
  }
  catch {
    // La base est le seul endroit où vit cet historique : s'il est inaccessible,
    // on le dit plutôt que de rendre un fil vide, qui se lirait « rien ne s'est
    // passé ».
    event.node.res.statusCode = 503
    return { echec: 'base-inaccessible' }
  }
})
