<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Cairn Dashboard — connexion' })

const route = useRoute()

const messages: Record<string, string> = {
  etat: 'La demande de connexion a expiré ou n\'a pas pu être vérifiée. Recommencez.',
  jeton: 'GitHub n\'a pas confirmé la connexion. Recommencez.',
  identite: 'L\'identité n\'a pas pu être lue chez GitHub. Recommencez.',
}

const erreur = computed(() => {
  const cle = String(route.query.erreur ?? '')
  return cle ? (messages[cle] ?? 'La connexion a échoué. Recommencez.') : null
})
</script>

<template>
  <main class="ecran">
    <section class="carte">
      <span class="marque" aria-hidden="true">◈</span>
      <h1>Cairn Dashboard</h1>
      <p class="mention">Suivi du projet Cairn WMS</p>

      <p v-if="erreur" class="erreur" role="alert">{{ erreur }}</p>

      <a class="bouton" href="/auth/github">Se connecter avec GitHub</a>

      <p class="note">Ce site est réservé à un seul compte.</p>
    </section>
  </main>
</template>

<style scoped>
.ecran {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: var(--sp-5);
  background: var(--c-window);
}

.carte {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  width: min(360px, 100%);
  padding: var(--sp-6);
  border: 1px solid var(--c-border);
  border-radius: var(--r-card);
  background: var(--c-card);
  text-align: center;
}

.marque {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: var(--r-tile);
  background: var(--c-accent);
  color: #ffffff;
  font-size: var(--fs-lg);
}

.mention {
  color: var(--c-muted);
  font-size: var(--fs-sm);
}

.erreur {
  width: 100%;
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--c-alert);
  border-radius: var(--r-tile);
  color: var(--c-alert-soft);
  font-size: var(--fs-md);
}

.bouton {
  width: 100%;
  margin-top: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-tile);
  background: var(--c-accent);
  color: #ffffff;
  font-size: var(--fs-base);
  font-weight: 600;
}

.bouton:hover {
  background: var(--c-accent-soft);
  color: #ffffff;
}

.note {
  color: var(--c-dim);
  font-size: var(--fs-xs);
}
</style>
