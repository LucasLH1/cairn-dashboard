<script setup lang="ts">
// La documentation de cairn-wms — tranche 2 : l'aperçu du dépôt, avec sa
// navigation. Le `README.md` du dossier, s'il existe, est montré d'abord.
definePageMeta({ titre: 'Documentation' })
useHead({ title: 'Cairn Dashboard — documentation' })
</script>

<template>
  <DocLecture :chemin="null" />
</template>
