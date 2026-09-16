<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Cairn Dashboard — accès refusé' })
</script>

<template>
  <main class="ecran">
    <section class="carte">
      <span class="marque" aria-hidden="true">✕</span>
      <h1>Accès refusé</h1>
      <p class="mention">
        Ce compte GitHub n'est pas celui auquel ce site est réservé. Aucune session n'a été ouverte.
      </p>
      <a class="bouton" href="/connexion">Revenir à la connexion</a>
    </section>
  </main>
</template>

<style scoped>
.ecran {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: var(--sp-frame);
  background: var(--g-page);
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
  box-shadow: var(--sh-frame);
  text-align: center;
}

/* Même carré encadré que la marque, dans la couleur d'alerte du design */
.marque {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--c-alert);
  border-radius: var(--r-rail);
  background: var(--c-alert-fond);
  color: var(--c-alert);
  font-size: var(--fs-lg);
}

.mention {
  color: var(--c-muted);
  font-size: var(--fs-md);
}

.bouton {
  width: 100%;
  margin-top: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--c-border);
  border-radius: var(--r-tile);
  background: var(--c-tile);
  color: var(--c-text);
  font-size: var(--fs-base);
  font-weight: 600;
}
</style>
