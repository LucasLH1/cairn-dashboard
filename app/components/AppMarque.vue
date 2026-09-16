<script setup lang="ts">
// La marque du design : un carré encadré, teinté de bleu, et son losange.
// Reprise telle quelle, plutôt que le carré plein d'accent de la tranche 1a.
withDefaults(defineProps<{ taille?: number }>(), { taille: 30 })
</script>

<template>
  <span
    class="marque"
    :style="{ width: `${taille}px`, height: `${taille}px` }"
    aria-hidden="true"
  >
    <span class="losange" />
  </span>
</template>

<style scoped>
.marque {
  display: grid;
  flex: none;
  place-items: center;
  border: 1px solid var(--c-marque-bord);
  border-radius: var(--r-rail);
  background: var(--c-marque-fond);
}

.losange {
  width: 14px;
  height: 14px;
  border: 2px solid var(--c-info);
  border-radius: 3px;
  transform: rotate(45deg);
}
</style>
