<script setup lang="ts">
// Un document de la documentation de cairn-wms — tranche 2.
const route = useRoute()

const chemin = computed(() => {
  const morceaux = route.params.chemin
  return Array.isArray(morceaux) ? morceaux.join('/') : String(morceaux ?? '')
})

definePageMeta({ titre: 'Documentation' })
useHead({ title: () => `Cairn Dashboard — ${chemin.value.replace(/\.md$/i, '').split('/').pop() ?? 'documentation'}` })
</script>

<template>
  <DocLecture :chemin="chemin" />
</template>
