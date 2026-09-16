<script setup lang="ts">
// Carte du design : cadre à coins de 14 px, titre de 16 px, sous-titre discret.
defineProps<{
  titre: string
  sousTitre?: string
  mention?: string
}>()
</script>

<template>
  <section class="carte">
    <header class="tete">
      <div class="titres">
        <h2>{{ titre }}</h2>
        <p v-if="sousTitre" class="sous-titre">{{ sousTitre }}</p>
      </div>
      <span v-if="mention" class="mention">{{ mention }}</span>
    </header>

    <div class="corps">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.carte {
  display: flex;
  flex-direction: column;
  padding: 14px 14px 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--r-card);
  background: var(--c-card);
}

.tete {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-4);
}

.titres {
  min-width: 0;
}

h2 {
  font-size: var(--fs-card);
  letter-spacing: -0.015em;
  line-height: 1.2;
}

.sous-titre {
  margin-top: var(--sp-1);
  color: var(--c-muted);
  font-size: var(--fs-md);
}

.mention {
  flex: none;
  padding: 3px var(--sp-3);
  border-radius: var(--r-pill);
  background: var(--c-tile);
  color: var(--c-muted);
  font-size: var(--fs-sm);
  white-space: nowrap;
}

.corps {
  margin-top: var(--sp-4);
  color: var(--c-muted);
  font-size: var(--fs-md);
}
</style>
