<script setup lang="ts">
// La zone principale d'un écran, à gauche de la colonne latérale : la colonne
// de contenu du design, avec sa base de flex, son remplissage et son pas.
</script>

<template>
  <div class="zone">
    <slot />
  </div>
</template>

<style scoped>
.zone {
  display: flex;
  flex: 999 1 var(--w-principal);
  flex-direction: column;
  gap: var(--sp-grille);
  min-width: 0;
  padding: var(--sp-contenu);
}
</style>
