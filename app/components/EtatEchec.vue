<script setup lang="ts">
// Ce qu'affiche un écran qui n'a pas pu lire. Bâti avec les briques du design,
// dans sa couleur d'alerte : le visiteur doit comprendre que le dashboard est
// empêché, non qu'il s'est trompé.
defineProps<{
  titre: string
  detail: string
}>()
</script>

<template>
  <div class="echec" role="status">
    <span class="signe" aria-hidden="true">!</span>
    <p class="titre">{{ titre }}</p>
    <p class="detail">{{ detail }}</p>
  </div>
</template>

<style scoped>
.echec {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-6) var(--sp-5);
  border-radius: var(--r-tile);
  background: var(--c-tile);
  text-align: center;
}

.signe {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--c-alert);
  border-radius: var(--r-rail);
  background: var(--c-alert-fond);
  color: var(--c-alert);
  font-size: var(--fs-lg);
  font-weight: 600;
}

.titre {
  color: var(--c-text);
  font-size: var(--fs-base);
  font-weight: 600;
}

.detail {
  max-width: 46ch;
  color: var(--c-muted);
  font-size: var(--fs-md);
}
</style>
