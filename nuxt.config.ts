// Configuration Nuxt — fiche 0001 (pile) et docs/deploiement.md §3 (contrat d'image).
export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  ssr: true,
  devtools: { enabled: false },
  compatibilityDate: '2026-09-16',

  css: [
    '~/assets/css/fonts.css',
    '~/assets/css/tokens.css',
    '~/assets/css/base.css',
  ],

  // Valeurs d'exécution. Les variables NUXT_* les remplacent au démarrage :
  // NUXT_GITHUB_TOKEN, NUXT_GITHUB_REPO, NUXT_SESSION_PASSWORD,
  // NUXT_ALLOWED_GITHUB_ID, NUXT_OAUTH_GITHUB_CLIENT_ID et _SECRET.
  // APP_COMMIT est inscrit dans l'image à sa construction.
  runtimeConfig: {
    githubToken: '',
    githubRepo: '',
    appCommit: '',
    sessionPassword: '',
    allowedGithubId: '',
    // Historique des événements — fiches 0006 et 0007. Le fichier vit sur un
    // volume persistant : sans lui, l'historique disparaîtrait à chaque
    // redéploiement, et c'est la seule donnée que le dashboard ne peut pas
    // relire ailleurs.
    baseFichier: '',
    webhookSecret: '',
    // Secret partagé avec les hooks Claude Code des deux dépôts suivis
    // (fiche 0008). Sans lui, la route de réception n'accepte rien.
    hooksSecret: '',
    // Le connecteur MCP (fiche 0011) : l'identifiant du seul client autorisé,
    // Claude — public, saisi dans les paramètres avancés du connecteur — et le
    // secret qui signe ses jetons d'accès. Sans eux, le connecteur ne délivre
    // rien, et /health le dit.
    mcpClientId: '',
    mcpSecret: '',
    oauth: {
      github: {
        clientId: '',
        clientSecret: '',
      },
    },
  },

  // Développement local sur données fictives — fiche 0010. Ces clés n'existent
  // qu'en développement : l'image de production ne les connaît pas, et une
  // variable NUXT_* ne peut pas les y faire naître. `npm run dev:fictif` les fait
  // pointer vers le faux GitHub du poste.
  $development: {
    runtimeConfig: {
      githubApiUrl: '',
      githubWebUrl: '',
    },
  },

  nitro: {
    preset: 'node-server',
    // Le fil en direct (tranche 5). La fiche 0001 a retenu Nuxt parce que Nitro
    // offre le WebSocket nativement ; l'option qui l'active a été trouvée par
    // l'expérience — construction, connexion réelle, aller-retour — et non dans
    // une documentation.
    experimental: { websocket: true },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'Cairn Dashboard',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Suivi du projet Cairn WMS.' },
        { name: 'robots', content: 'noindex, nofollow' },
      ],
      link: [{ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    },
  },
})
