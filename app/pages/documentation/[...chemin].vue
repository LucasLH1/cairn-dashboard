<script setup lang="ts">
// Un document de la documentation de cairn-wms, rendu — tranche 2.
//
// Le HTML affiché vient du serveur, produit par markdown-it dans sa
// configuration par défaut (fiche 0004) : le HTML brut du document n'est jamais
// émis, il est échappé. C'est ce qui rend cet affichage sûr.
//
// Le document porte son propre titre : la carte n'en remet pas un par-dessus.
// Le chemin et la branche vivent dans le fil, au-dessus.
import { MESSAGES } from '~~/server/utils/echec-doc'
import type { EchecDoc } from '~~/server/utils/doc-github'

const route = useRoute()

const chemin = computed(() => {
  const morceaux = route.params.chemin
  return Array.isArray(morceaux) ? morceaux.join('/') : String(morceaux ?? '')
})

const { data } = await useFetch<{
  chemin?: string
  nom?: string
  branche?: string
  html?: string
  echec?: EchecDoc
}>('/api/doc/document', {
  query: { chemin },
  default: () => ({}),
})

const echec = computed(() => data.value?.echec ?? null)

definePageMeta({ titre: 'Documentation' })
useHead({ title: () => `Cairn Dashboard — ${data.value?.nom ?? 'documentation'}` })
</script>

<template>
  <div class="colonne">
    <nav class="fil" aria-label="Chemin">
      <NuxtLink to="/documentation">Documentation</NuxtLink>
      <span aria-hidden="true">·</span>
      <span class="ici">docs/{{ chemin }}</span>
      <span aria-hidden="true">·</span>
      <span>branche {{ data?.branche ?? 'dev' }}</span>
    </nav>

    <BaseCard
      v-if="echec"
      titre="Document"
      :sous-titre="`docs/${chemin}`"
    >
      <EtatEchec :titre="MESSAGES[echec].titre" :detail="MESSAGES[echec].detail" />
    </BaseCard>

    <section v-else class="feuille">
      <!-- eslint-disable-next-line vue/no-v-html -- HTML produit par markdown-it,
           sans HTML brut du document : fiche 0004, éprouvé dans test/markdown.spec.ts -->
      <article class="prose" v-html="data?.html" />
    </section>
  </div>
</template>

<style scoped>
.colonne {
  display: flex;
  flex-direction: column;
  gap: var(--sp-grille);
}

.fil {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2);
  color: var(--c-dim);
  font-size: var(--fs-sm);
}

.fil a {
  color: var(--c-muted);
}

.fil a:hover {
  color: var(--c-text);
}

.ici {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* La carte du design, sans en-tête : le document porte déjà son titre. */
.feuille {
  padding: var(--sp-6);
  border: 1px solid var(--c-border);
  border-radius: var(--r-card);
  background: var(--c-card);
}

/* Le document rendu. Les tailles et les couleurs sont celles du design : on
   n'invente pas une échelle typographique pour la documentation. */
.prose {
  color: var(--c-muted);
  font-size: var(--fs-base);
  line-height: 1.65;
}

.prose :deep(h1),
.prose :deep(h2),
.prose :deep(h3) {
  margin: var(--sp-6) 0 var(--sp-3);
  color: var(--c-text);
  letter-spacing: -0.015em;
  line-height: 1.25;
}

.prose :deep(h1) {
  font-size: var(--fs-title);
}

.prose :deep(h2) {
  font-size: var(--fs-card);
}

.prose :deep(h3) {
  font-size: var(--fs-lg);
}

.prose :deep(h1:first-child),
.prose :deep(h2:first-child) {
  margin-top: 0;
}

.prose :deep(p),
.prose :deep(ul),
.prose :deep(ol) {
  margin: 0 0 var(--sp-4);
}

.prose :deep(ul),
.prose :deep(ol) {
  padding-left: var(--sp-6);
}

.prose :deep(li) {
  margin-bottom: var(--sp-1);
}

.prose :deep(strong) {
  color: var(--c-text);
}

.prose :deep(a) {
  color: var(--c-info);
}

.prose :deep(a:hover) {
  color: var(--c-info-soft);
}

.prose :deep(code) {
  padding: 1px 5px;
  border-radius: var(--r-chip);
  background: var(--c-tile);
  color: var(--c-text);
  font-family: var(--font-mono);
  font-size: var(--fs-md);
}

.prose :deep(pre) {
  overflow-x: auto;
  margin: 0 0 var(--sp-4);
  padding: var(--sp-4);
  border-radius: var(--r-tile);
  background: var(--c-tile);
}

.prose :deep(pre code) {
  padding: 0;
  background: transparent;
}

.prose :deep(blockquote) {
  margin: 0 0 var(--sp-4);
  padding: var(--sp-2) var(--sp-4);
  border-left: 2px solid var(--c-border);
  color: var(--c-dim);
}

.prose :deep(table) {
  display: block;
  overflow-x: auto;
  width: 100%;
  margin: 0 0 var(--sp-4);
  border-collapse: collapse;
  font-size: var(--fs-md);
}

.prose :deep(th),
.prose :deep(td) {
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--c-border);
  text-align: left;
}

.prose :deep(th) {
  background: var(--c-tile);
  color: var(--c-text);
  font-weight: 600;
}

.prose :deep(hr) {
  margin: var(--sp-6) 0;
  border: 0;
  border-top: 1px solid var(--c-border);
}
</style>
