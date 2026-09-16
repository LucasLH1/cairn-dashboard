// Connexion au fil en direct — tranche 5.
//
// Le navigateur charge le fil une fois par l'API, puis ne reçoit que les
// nouveautés : il n'y a pas de sondage, c'est tout l'intérêt du WebSocket
// retenu par la fiche 0001.
//
// La connexion se rouvre toute seule quand elle tombe — un redéploiement la
// ferme, et l'écran ne doit pas rester muet jusqu'au prochain rechargement.
// Le délai croît pour ne pas marteler un serveur qui redémarre.

export type EtatFil = 'connexion' | 'ouvert' | 'ferme'

export interface MessageFil {
  sorte: 'bonjour' | 'evenement'
  evenement?: Record<string, unknown>
}

const DELAI_INITIAL_MS = 1000
const DELAI_MAXIMUM_MS = 30_000

export function useFilDirect(surEvenement: (evenement: Record<string, unknown>) => void) {
  const etat = ref<EtatFil>('ferme')

  let prise: WebSocket | null = null
  let minuteur: ReturnType<typeof setTimeout> | null = null
  let delai = DELAI_INITIAL_MS
  let abandonne = false

  function adresse(): string {
    const protocole = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocole}//${window.location.host}/fil`
  }

  function programmerReprise() {
    if (abandonne || minuteur !== null) return
    minuteur = setTimeout(() => {
      minuteur = null
      delai = Math.min(delai * 2, DELAI_MAXIMUM_MS)
      ouvrir()
    }, delai)
  }

  function ouvrir() {
    if (abandonne) return

    etat.value = 'connexion'

    try {
      prise = new WebSocket(adresse())
    }
    catch {
      etat.value = 'ferme'
      programmerReprise()
      return
    }

    prise.onopen = () => {
      etat.value = 'ouvert'
      delai = DELAI_INITIAL_MS
    }

    prise.onmessage = (message) => {
      try {
        const lu = JSON.parse(String(message.data)) as MessageFil
        if (lu.sorte === 'evenement' && lu.evenement) surEvenement(lu.evenement)
      }
      catch {
        // Message illisible : on l'ignore plutôt que de casser le fil.
      }
    }

    prise.onclose = () => {
      etat.value = 'ferme'
      programmerReprise()
    }

    prise.onerror = () => {
      // `onclose` suit toujours : la reprise est programmée là.
      etat.value = 'ferme'
    }
  }

  onMounted(ouvrir)

  onBeforeUnmount(() => {
    abandonne = true
    if (minuteur !== null) clearTimeout(minuteur)
    prise?.close()
    prise = null
  })

  return { etat }
}
