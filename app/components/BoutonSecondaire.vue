<script setup lang="ts">
// Le bouton discret du design (« Filtre ») : sur fond de carte, à filet, avec
// une icône devant son libellé. Il porte aussi les liens de même aspect
// (« Voir sur GitHub ↗ »).
import { NuxtLink } from '#components'

defineProps<{
  to?: string
  href?: string
  type?: 'button' | 'submit'
  disabled?: boolean
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
  >
    <slot name="icone" />
    <slot />
  </component>
</template>

<style scoped>
.bouton {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 7px 13px;
  border: 1px solid var(--c-border);
  border-radius: var(--r-tile);
  background: var(--c-card);
  color: var(--c-text);
  font-size: var(--fs-md);
  font-weight: 500;
}

.bouton:hover {
  background: var(--c-tile);
  color: var(--c-text);
}

.bouton:disabled {
  color: var(--c-dim);
  cursor: not-allowed;
}
</style>
