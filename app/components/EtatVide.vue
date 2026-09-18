<script setup lang="ts">
// Ce qu'affiche une zone qui n'a rien à montrer. Bâti avec les briques du
// design — tuile, cercle, texte discret — puisqu'il n'en fournit pas.
defineProps<{
  message: string
  mention?: string
}>()
</script>

<template>
  <div class="vide">
    <span class="signe" aria-hidden="true" />
    <p class="message">{{ message }}</p>
    <p v-if="mention" class="mention">{{ mention }}</p>
  </div>
</template>

<style scoped>
.vide {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-6) var(--sp-5);
  border: 1px solid var(--c-border);
  border-radius: var(--r-tuile);
  background: var(--c-tile);
  text-align: center;
}

.signe {
  width: 22px;
  height: 22px;
  border: 1.5px solid var(--c-dim);
  border-radius: 50%;
}

.message {
  color: var(--c-muted);
  font-size: var(--fs-md);
}

.mention {
  color: var(--c-dim);
  font-size: var(--fs-sm);
}
</style>
