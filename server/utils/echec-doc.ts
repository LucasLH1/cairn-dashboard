// Ce que le dashboard répond quand la lecture chez GitHub échoue.
//
// Le code HTTP dit à qui revient le problème : un document absent est une
// erreur de la demande, tout le reste est un empêchement du dashboard — le
// visiteur n'y peut rien, et l'écran doit le dire sans le laisser croire qu'il
// s'est trompé.
import type { EchecDoc } from './doc-github'

export function codeHttpPour(echec: EchecDoc): number {
  switch (echec) {
    case 'absent':
      return 404
    case 'non-configure':
    case 'quota':
      return 503
    case 'refuse':
    case 'injoignable':
    case 'illisible':
      return 502
  }
}

/** Ce qu'on écrit à l'écran pour chaque cause. Une phrase, sans jargon. */
export const MESSAGES: Record<EchecDoc, { titre: string, detail: string }> = {
  'non-configure': {
    titre: 'Lecture non configurée',
    detail: 'Le dashboard n\'a pas de quoi lire le dépôt cairn-wms. La configuration du serveur est incomplète.',
  },
  'refuse': {
    titre: 'Lecture refusée par GitHub',
    detail: 'GitHub a refusé la lecture du dépôt. Le jeton du dashboard est invalide ou n\'a plus les droits nécessaires.',
  },
  'quota': {
    titre: 'Quota GitHub épuisé',
    detail: 'Le dashboard a atteint sa limite d\'appels à GitHub. La lecture redeviendra possible à la prochaine remise à zéro.',
  },
  'absent': {
    titre: 'Document introuvable',
    detail: 'Ce document n\'existe pas dans la documentation de cairn-wms, sur la branche lue.',
  },
  'injoignable': {
    titre: 'GitHub injoignable',
    detail: 'Le dashboard n\'a pas pu joindre GitHub. Le service est peut-être indisponible.',
  },
  'illisible': {
    titre: 'Suivi illisible',
    detail: 'Le fichier de suivi a été lu, mais sa forme n\'est pas celle attendue. Rien n\'est affiché plutôt que de montrer un avancement deviné.',
  },
}
