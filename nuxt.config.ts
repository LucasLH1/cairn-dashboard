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
    oauth: {
      github: {
        clientId: '',
        clientSecret: '',
      },
    },
  },

  nitro: {
    preset: 'node-server',
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
