<script setup lang="ts">
// Le nombre mis en avant du design : 31 px, serré, et son unité en retrait.
defineProps<{
  valeur: string | number
  unite?: string
}>()
</script>

<template>
  <div class="chiffre">
    {{ valeur }}<span v-if="unite" class="unite">{{ unite }}</span>
  </div>
</template>

<style scoped>
.chiffre {
  font-size: var(--fs-number);
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 1;
}

.unite {
  color: var(--c-muted);
  font-size: var(--fs-xl);
  font-weight: 500;
}
</style>
