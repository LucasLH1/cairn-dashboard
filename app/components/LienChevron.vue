<script setup lang="ts">
// Le lien d'en-tête du design : « Tout voir › », en bleu, chevron plus petit.
defineProps<{
  to?: string
  href?: string
}>()
</script>

<template>
  <NuxtLink v-if="to" :to="to" class="lien">
    <slot />
    <span class="chevron" aria-hidden="true">›</span>
  </NuxtLink>
  <a v-else :href="href" class="lien" target="_blank" rel="nofollow noopener noreferrer">
    <slot />
    <span class="chevron" aria-hidden="true">›</span>
  </a>
</template>

<style scoped>
.lien {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--sp-1);
  color: var(--c-info);
  font-size: var(--fs-base);
  font-weight: 500;
  white-space: nowrap;
}

.lien:hover {
  color: var(--c-info-soft);
}

.chevron {
  font-size: var(--fs-xs);
}
</style>
