// Le fil d'activité, partagé par tous ceux qui l'affichent.
//
// La colonne latérale le charge une fois et y verse ce qui arrive en direct ;
// l'accueil y lit ses sessions de la semaine. La clé fixe fait que Nuxt ne
// demande le fil qu'une fois, et que tous voient la même liste.

export interface EvenementFil {
  livraison: string
  source: 'github' | 'claude-code' | string
  session: string | null
  type: string
  action: string | null
  depot: string | null
  auteur: string | null
  titre: string | null
  url: string | null
  recuLe: string
}

/** Assez pour une semaine de travail, sans peser sur la base. */
export const LIMITE_FIL = 200

export function useFil() {
  const { data: fil } = useFetch<{
    evenements?: EvenementFil[]
    total?: number
    echec?: string
  }>('/api/fil', { key: 'fil', query: { limite: LIMITE_FIL }, default: () => ({}) })

  const evenements = computed<EvenementFil[]>(() => fil.value?.evenements ?? [])

  /** Verse un événement reçu en direct, sans doublon, en tête. */
  function recevoir(brut: Record<string, unknown>) {
    const e = brut as unknown as EvenementFil
    const courants = fil.value?.evenements ?? []
    fil.value = {
      ...fil.value,
      evenements: [e, ...courants.filter(x => x.livraison !== e.livraison)].slice(0, LIMITE_FIL),
      total: (fil.value?.total ?? courants.length) + (courants.some(x => x.livraison === e.livraison) ? 0 : 1),
    }
  }

  return { fil, evenements, recevoir }
}

/** L'état de la connexion en direct, partagé : l'en-tête et la colonne le montrent. */
export function useEtatFil() {
  return useState<'connexion' | 'ouvert' | 'ferme'>('fil-etat', () => 'ferme')
}
