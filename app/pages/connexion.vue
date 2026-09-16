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
  <PanneauAcces>
    <section class="carte">
      <AppMarque :taille="34" />

      <div class="titres">
        <h2>Connexion</h2>
        <p class="mention">Par votre compte GitHub.</p>
      </div>

      <p v-if="erreur" class="erreur" role="alert">{{ erreur }}</p>

      <a class="bouton" href="/auth/github">Se connecter avec GitHub</a>

      <span class="filet" />

      <p class="note">
        Ce site est réservé à un seul compte. Toute autre identité est refusée.
      </p>
    </section>
  </PanneauAcces>
</template>

<style scoped>
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
  box-shadow: var(--sh-frame);
  text-align: center;
}

.titres {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.mention {
  color: var(--c-muted);
  font-size: var(--fs-md);
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
  background: var(--g-accent);
  box-shadow: var(--sh-accent);
  color: #ffffff;
  font-size: var(--fs-base);
  font-weight: 600;
}

.bouton:hover {
  filter: brightness(1.06);
  color: #ffffff;
}

.filet {
  width: 100%;
  height: 1px;
  margin-top: var(--sp-2);
  background: var(--c-border);
}

.note {
  color: var(--c-dim);
  font-size: var(--fs-xs);
}
</style>
