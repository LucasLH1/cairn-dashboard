// Le fil en direct — tranche 5.
//
// Un gestionnaire WebSocket, natif à Nitro (fiche 0001), activé par
// `nitro.experimental.websocket`. Le navigateur s'y connecte après avoir chargé
// le fil par l'API : il ne reçoit ensuite que les nouveautés.
//
// Cette adresse n'est **pas** publique : le middleware d'authentification
// s'applique, comme à tout ce qui n'est pas dans la liste fermée de
// `server/utils/acces.ts`.
import { inscrire, retirer } from '../utils/diffusion'
import type { Connexion } from '../utils/diffusion'

export default defineWebSocketHandler({
  open(pair) {
    inscrire(pair as unknown as Connexion)
    pair.send(JSON.stringify({ sorte: 'bonjour' }))
  },

  close(pair) {
    retirer(pair as unknown as Connexion)
  },

  error(pair) {
    retirer(pair as unknown as Connexion)
  },
})
