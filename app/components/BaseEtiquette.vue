<script setup lang="ts">
// L'étiquette du design, en deux formes : la courte, à coins de 7 px
// (« +12 % ↗ »), et la ronde, à point, pour un état (« ● à jour »). Chaque
// teinte reprend le fond et le texte que le design lui donne.
withDefaults(defineProps<{
  teinte?: 'neutre' | 'ok' | 'alerte' | 'warn' | 'info' | 'accent'
  ronde?: boolean
  /** Le point qui précède le texte, dans la forme ronde. */
  point?: boolean
}>(), { teinte: 'neutre', ronde: false, point: false })
</script>

<template>
  <span class="etiquette" :class="[`etiquette--${teinte}`, { 'etiquette--ronde': ronde }]">
    <span v-if="point" class="point" aria-hidden="true" />
    <slot />
  </span>
</template>

<style scoped>
.etiquette {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--sp-2);
  padding: 3px 8px;
  border-radius: var(--r-chip);
  background: var(--c-tile);
  color: var(--c-muted);
  font-size: var(--fs-xs);
  font-weight: 500;
  white-space: nowrap;
}

.etiquette--ronde {
  padding: 4px 10px;
  border-radius: var(--r-pill);
  font-size: var(--fs-sm);
}

.point {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentcolor;
}

.etiquette--ok {
  background: var(--c-ok-fond);
  color: var(--c-ok);
}

.etiquette--alerte {
  background: var(--c-alert-teinte);
  color: var(--c-alert-soft);
}

.etiquette--warn {
  background: var(--c-warn-fond);
  color: var(--c-warn);
}

.etiquette--info {
  background: var(--c-info-fond);
  color: var(--c-info-soft);
}

.etiquette--accent {
  background: var(--c-accent-fond);
  color: var(--c-accent-soft);
}
</style>
