<script setup lang="ts">
defineProps<{
  titre: string
  mention?: string
}>()
</script>

<template>
  <section class="carte">
    <header class="tete">
      <h2>{{ titre }}</h2>
      <span v-if="mention" class="mention">{{ mention }}</span>
    </header>
    <div class="corps">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.carte {
  border: 1px solid var(--c-border);
  border-radius: var(--r-card);
  background: var(--c-card);
}

.tete {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  padding: var(--sp-5) var(--sp-5) var(--sp-3);
}

.mention {
  padding: 3px var(--sp-3);
  border-radius: var(--r-pill);
  background: var(--c-tile);
  color: var(--c-muted);
  font-size: var(--fs-xs);
  white-space: nowrap;
}

.corps {
  padding: 0 var(--sp-5) var(--sp-5);
  color: var(--c-muted);
  font-size: var(--fs-md);
}
</style>
