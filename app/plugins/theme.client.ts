// Applique le thème choisi par le visiteur sur toutes les pages, y compris
// celles qui n'ont pas d'en-tête — donc pas de sélecteur : connexion et refus.
//
// Sans lui, le choix enregistré n'était honoré que derrière la connexion, le
// sélecteur étant le seul à poser l'attribut. Sans choix enregistré, c'est le
// sombre : le thème par défaut, comme dans le design — le système n'est pas
// consulté (journal du 2026-09-18).
export default defineNuxtPlugin(() => {
  let enregistre: string | null

  try {
    enregistre = localStorage.getItem('cairn-theme')
  }
  catch {
    // Stockage refusé (navigation privée) : le sombre, par défaut.
    return
  }

  if (enregistre === 'dark' || enregistre === 'light') {
    document.documentElement.dataset.theme = enregistre
  }
})
