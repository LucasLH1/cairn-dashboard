<script setup lang="ts">
// La ligne de liste du design : un disque d'icône, un titre sur une ligne, un
// texte secondaire, et une place à droite.
//
// La ligne **courante** est une tuile cernée, au disque plein d'accent et au
// texte secondaire en accent ; les autres sont nues, et se teintent au survol.
//
// Sans destination, la ligne est un simple bloc : ce qu'elle porte à droite
// peut alors être des liens, ce qu'un lien ne peut pas contenir.
import { NuxtLink } from '#components'

defineProps<{
  titre: string
  sous?: string
  to?: string
  href?: string
  courant?: boolean
}>()
</script>

<template>
  <component
    :is="to ? NuxtLink : (href ? 'a' : 'div')"
    :to="to"
    :href="href"
    :target="href ? '_blank' : undefined"
    :rel="href ? 'nofollow noopener noreferrer' : undefined"
    class="ligne"
    :class="{ 'ligne--courante': courant }"
  >
    <span class="disque" aria-hidden="true">
      <slot name="icone">
        <span v-if="courant" class="pause" />
        <span v-else class="lecture" />
      </slot>
    </span>

    <span class="corps">
      <span class="titre">{{ titre }}</span>
      <span v-if="sous" class="sous">{{ sous }}</span>
    </span>

    <span v-if="$slots.droite" class="droite">
      <slot name="droite" />
    </span>
  </component>
</template>

<style scoped>
.ligne {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 13px;
  border: 1px solid transparent;
  border-radius: var(--r-tuile);
  background: transparent;
  color: var(--c-text);
}

.ligne:hover {
  background: var(--c-tile);
  color: var(--c-text);
}

.ligne--courante {
  gap: var(--sp-4);
  padding: 10px 11px;
  border-color: var(--c-border);
  background: var(--c-tile);
}

.ligne--courante:hover {
  border-color: var(--c-accent-survol);
}

.disque {
  display: grid;
  flex: none;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--c-border);
  border-radius: 50%;
  background: var(--c-tile);
}

.ligne--courante .disque {
  border: 0;
  background: var(--c-accent);
}

/* Les glyphes du design, dessinés en CSS : la lecture, et la pause. */
.lecture {
  width: 0;
  height: 0;
  margin-left: 3px;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-left: 9px solid var(--c-muted);
}

.pause {
  width: 11px;
  height: 12px;
  border-right: 3.5px solid var(--c-sur-accent);
  border-left: 3.5px solid var(--c-sur-accent);
}

.corps {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.titre {
  overflow: hidden;
  font-size: var(--fs-ligne);
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sous {
  margin-top: 2px;
  overflow: hidden;
  color: var(--c-muted);
  font-size: var(--fs-sous);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ligne--courante .sous {
  color: var(--c-accent);
}

.droite {
  flex: none;
  color: var(--c-dim);
  font-size: var(--fs-ligne);
}
</style>
