// Applique le thème choisi par le visiteur sur toutes les pages, y compris
// celles qui n'ont pas d'en-tête — donc pas de sélecteur : connexion et refus.
//
// Sans lui, le choix enregistré n'était honoré que derrière la connexion, le
// sélecteur étant le seul à poser l'attribut. Le thème du système, lui, a
// toujours été respecté : les feuilles de style s'en chargent.
export default defineNuxtPlugin(() => {
  let enregistre: string | null

  try {
    enregistre = localStorage.getItem('cairn-theme')
  }
  catch {
    // Stockage refusé (navigation privée) : le thème du système fait foi.
    return
  }

  if (enregistre === 'dark' || enregistre === 'light') {
    document.documentElement.dataset.theme = enregistre
  }
})
