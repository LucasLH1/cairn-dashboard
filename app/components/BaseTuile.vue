<script setup lang="ts">
// La tuile du design : un libellé discret, une valeur, un détail — et, en
// haut à droite, une place pour un point d'état. Elle se teinte selon ce
// qu'elle porte : l'alerte réclame l'attention, l'accent dit ce qui est
// courant, l'info désigne une action.
//
// La forme **compacte** est celle des deux tuiles de la carte mise en avant :
// sans filet, coins de 10 px, libellé au-dessus d'une valeur de 14 px.
import { NuxtLink } from '#components'

const props = defineProps<{
  libelle?: string
  valeur?: string
  detail?: string
  teinte?: 'neutre' | 'alerte' | 'accent' | 'info' | 'ok'
  compacte?: boolean
  to?: string
  href?: string
}>()

const balise = computed(() => (props.to ? NuxtLink : (props.href ? 'a' : 'div')))
const classes = computed(() => [
  `tuile--${props.teinte ?? 'neutre'}`,
  { 'tuile--compacte': props.compacte, 'tuile--lien': Boolean(props.to || props.href) },
])
</script>

<template>
  <component
    :is="balise"
    :to="to"
    :href="href"
    :target="href ? '_blank' : undefined"
    :rel="href ? 'nofollow noopener noreferrer' : undefined"
    class="tuile"
    :class="classes"
  >
    <div v-if="libelle || $slots.coin" class="haut">
      <span v-if="libelle" class="libelle">{{ libelle }}</span>
      <slot name="coin" />
    </div>

    <div v-if="valeur || $slots.valeur" class="valeur">
      <slot name="valeur">{{ valeur }}</slot>
    </div>

    <div v-if="detail || $slots.default" class="detail">
      <slot>{{ detail }}</slot>
    </div>
  </component>
</template>

<style scoped>
.tuile {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 11px;
  border: 1px solid var(--c-border);
  border-radius: var(--r-tuile);
  background: var(--c-tile);
  color: var(--c-text);
}

.tuile--lien:hover {
  border-color: var(--c-accent-survol);
  color: var(--c-text);
}

.tuile--alerte {
  border-color: var(--c-alert-bord);
  background: var(--c-alert-fond);
}

.tuile--accent {
  border-color: var(--c-accent-bord);
  background: var(--c-accent-fond);
}

.tuile--info {
  border-color: var(--c-info-bord);
  background: var(--c-info-fond);
}

.tuile--compacte {
  padding: 8px 10px;
  border: 0;
  border-radius: var(--r-tile);
}

.haut {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-2);
}

.libelle {
  overflow: hidden;
  color: var(--c-muted);
  font-size: var(--fs-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tuile--compacte .libelle {
  font-size: var(--fs-sm);
}

.valeur {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 2px;
  font-size: var(--fs-tuile);
  font-weight: 500;
  line-height: 1.25;
  /* Un mot plus long que la tuile — un sujet de journal, un nom de dépôt — se
     coupe plutôt que de déborder : le design ne pose que des valeurs courtes. */
  overflow-wrap: anywhere;
}

.tuile--compacte .valeur {
  margin-top: 3px;
  font-size: var(--fs-lg);
  letter-spacing: -0.01em;
}

.tuile--alerte .valeur {
  color: var(--c-alert-soft);
}

.tuile--accent .valeur {
  color: var(--c-accent-soft);
}

.tuile--info .valeur {
  color: var(--c-info-soft);
}

.detail {
  margin-top: 4px;
  color: var(--c-muted);
  font-size: var(--fs-sm);
  line-height: 1.35;
}
</style>
