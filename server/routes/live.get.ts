// /live — le contrôle de santé du conteneur.
//
// Il ne dépend de **rien** d'extérieur : ni GitHub, ni la configuration de la
// connexion. Il répond 200 tant que le processus sert des requêtes.
//
// Pourquoi le distinguer de `/health` : depuis la tranche 3, la sonde éprouve
// une lecture réelle chez GitHub, et passe donc à 503 si GitHub est refusé,
// injoignable ou à court de quota. C'est voulu — elle dit que le service n'est
// pas pleinement utilisable, et le déploiement doit s'en soucier.
//
// Mais le **conteneur**, lui, va bien. Le redémarrer n'y changerait rien, et
// une panne chez GitHub ne doit pas se transformer en panne d'hébergement.
// L'un répond « ce processus vit », l'autre « ce service est utilisable ».
export default defineEventHandler(() => {
  return new Response(JSON.stringify({ status: 'live' }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
})
