// Ouverture de la base au démarrage, et purge — fiches 0006 et 0007.
//
// Deux raisons de le faire ici plutôt qu'à la première requête :
//
//   - une base qui ne s'ouvre pas doit se voir **au démarrage**, pas au premier
//     webhook reçu — un événement perdu n'est pas rejouable ;
//   - les migrations s'appliquent une fois, avant que quoi que ce soit n'écrive.
//
// La purge s'exécute au démarrage puis une fois par jour, comme la fiche 0007
// le décide. Le minuteur est détaché : il n'empêche pas le processus de
// s'arrêter quand on le lui demande.
import { obtenirBase, purgerBase } from '../utils/instance-base'

const UN_JOUR_MS = 24 * 3600 * 1000

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()

  try {
    obtenirBase(config)
  }
  catch (erreur) {
    // On ne fait pas échouer le démarrage : /health dira que la base est
    // inaccessible, et le déploiement refusera de se déclarer bon. Le reste du
    // dashboard — documentation, avancement, tickets — continue de servir.
    console.error('[base] ouverture impossible :', (erreur as Error).message)
    return
  }

  const purge = () => {
    try {
      const efface = purgerBase(config)
      if (efface > 0) console.info(`[base] purge : ${efface} événement(s) effacé(s)`)
    }
    catch (erreur) {
      console.error('[base] purge impossible :', (erreur as Error).message)
    }
  }

  purge()
  setInterval(purge, UN_JOUR_MS).unref()
})
