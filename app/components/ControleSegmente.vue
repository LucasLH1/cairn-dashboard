<script setup lang="ts">
// Le contrôle segmenté du design : des pilules dans une tuile, la courante
// posée sur la pastille claire — la même que celle du sélecteur de thème.
defineProps<{
  options: Array<{ valeur: string, libelle: string }>
  modelValue: string
  nom: string
}>()

defineEmits<{ 'update:modelValue': [valeur: string] }>()
</script>

<template>
  <div class="segmente" role="group" :aria-label="nom">
    <button
      v-for="option in options"
      :key="option.valeur"
      type="button"
      class="pilule"
      :class="{ 'pilule--courante': option.valeur === modelValue }"
      :aria-pressed="option.valeur === modelValue"
      @click="$emit('update:modelValue', option.valeur)"
    >
      {{ option.libelle }}
    </button>
  </div>
</template>

<style scoped>
.segmente {
  display: flex;
  flex: none;
  gap: 3px;
  padding: 4px;
  border-radius: var(--r-tuile);
  background: var(--c-tile);
}

.pilule {
  padding: 7px 14px;
  border: 0;
  border-radius: var(--r-segment);
  background: transparent;
  color: var(--c-muted);
  font-size: var(--fs-md);
  font-weight: 500;
}

.pilule--courante {
  background: var(--c-bascule);
  box-shadow: var(--sh-bascule);
  color: var(--c-text);
}
</style>
