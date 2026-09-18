<script setup lang="ts">
// Le bouton d'action du design : bleu, sur fond teinté, à filet. C'est la
// forme de ce qui déclenche quelque chose — « Déployer », « Ouvrir ».
//
// En **tuile**, il prend la place d'une tuile dans une grille, avec son
// disque « + » au-dessus du libellé.
import { NuxtLink } from '#components'

defineProps<{
  to?: string
  href?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  tuile?: boolean
  /** Le signe dans le disque, en forme tuile. */
  signe?: string
}>()
</script>

<template>
  <component
    :is="to ? NuxtLink : (href ? 'a' : 'button')"
    :to="to"
    :href="href"
    :type="to || href ? undefined : (type ?? 'button')"
    :disabled="disabled || undefined"
    :target="href ? '_blank' : undefined"
    :rel="href ? 'nofollow noopener noreferrer' : undefined"
    class="bouton"
    :class="{ 'bouton--tuile': tuile }"
  >
    <span v-if="tuile" class="disque" aria-hidden="true">{{ signe ?? '+' }}</span>
    <slot />
  </component>
</template>

<style scoped>
.bouton {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 11px;
  border: 1px solid var(--c-info-bord);
  border-radius: var(--r-tuile);
  background: var(--c-info-fond);
  color: var(--c-info-soft);
  font-size: var(--fs-base);
  font-weight: 500;
  line-height: 1.3;
  text-align: center;
}

.bouton:hover {
  background: var(--c-info-survol);
  color: var(--c-info-soft);
}

.bouton:disabled {
  border-color: var(--c-border);
  background: var(--c-tile);
  color: var(--c-dim);
  cursor: not-allowed;
}

.bouton--tuile {
  flex-direction: column;
  gap: var(--sp-3);
}

.disque {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--c-info-survol);
  font-size: var(--fs-ligne);
}
</style>
