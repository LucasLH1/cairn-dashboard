<script setup lang="ts">
// Le journal de cairn-wms — tranche 5, sur les briques du design.
//
// Les entrées sont les siennes, dans son format : en-tête à `modules`, et des
// champs que nous ne connaissons pas — comme `annulee_par` — qui sont affichés
// tels quels plutôt qu'écartés.
import { dateCourte, heureDe, lireDateJournal } from '~/utils/temps'
import { MESSAGES } from '~~/server/utils/echec-doc'
import type { EntreeJournal } from '~~/server/utils/journal-wms'
import type { EchecDoc } from '~~/server/utils/doc-github'

definePageMeta({ titre: 'Journal' })
useHead({ title: 'Cairn Dashboard — journal' })

const route = useRoute()

const module = ref(typeof route.query.module === 'string' ? route.query.module : '')
const issue = ref(typeof route.query.issue === 'string' ? route.query.issue : '')

const { data } = await useFetch<{
  depot?: string
  branche?: string
  entrees?: Array<EntreeJournal & { html: string }>
  total?: number
  citations?: { modules: string[], issues: number[] }
  echec?: EchecDoc
}>('/api/journal', {
  query: { module, issue },
  default: () => ({}),
})

const echec = computed(() => data.value?.echec ?? null)
const entrees = computed(() => data.value?.entrees ?? [])
const citations = computed(() => data.value?.citations ?? { modules: [], issues: [] })

const ouverte = ref<string | null>(null)

function basculer(fichier: string) {
  ouverte.value = ouverte.value === fichier ? null : fichier
}

function sujetDe(entree: EntreeJournal): string {
  return entree.sujet.charAt(0).toUpperCase() + entree.sujet.slice(1)
}

function quand(entree: EntreeJournal): string {
  const d = lireDateJournal(entree.date)
  return d ? `${dateCourte(d)} · ${heureDe(d)}` : entree.fichier
}
</script>

<template>
  <ZonePrincipale>
    <BaseCard v-if="echec" titre="Journal" sous-titre="lu dans cairn-wms">
      <EtatEchec :titre="MESSAGES[echec].titre" :detail="MESSAGES[echec].detail" />
    </BaseCard>

    <template v-else>
      <section class="tete">
        <div class="gauche">
          <h2 class="section">Journal de cairn-wms</h2>
          <BaseEtiquette>{{ entrees.length }} sur {{ data?.total ?? 0 }}</BaseEtiquette>
        </div>

        <div class="filtres">
          <select v-model="module" class="filtre" aria-label="Module">
            <option value="">Tous les modules</option>
            <option v-for="m in citations.modules" :key="m" :value="m">module {{ m }}</option>
          </select>
          <select v-model="issue" class="filtre" aria-label="Issue">
            <option value="">Toutes les issues</option>
            <option v-for="i in citations.issues" :key="i" :value="String(i)">#{{ i }}</option>
          </select>
        </div>
      </section>

      <EtatVide
        v-if="entrees.length === 0"
        message="Aucune entrée ne correspond à ces filtres."
        mention="Les sessions se retrouvent par module ou par issue citée."
      />

      <BaseCard
        v-for="entree in entrees"
        :key="entree.fichier"
        :titre="sujetDe(entree)"
        :sous-titre="quand(entree)"
      >
        <template #lien>
          <BoutonSecondaire @click="basculer(entree.fichier)">
            {{ ouverte === entree.fichier ? 'Replier' : 'Lire' }}
          </BoutonSecondaire>
        </template>

        <p v-if="entree.objectif" class="objectif">{{ entree.objectif }}</p>

        <div class="reperes">
          <BaseEtiquette v-for="m in entree.modules" :key="m" teinte="info">module {{ m }}</BaseEtiquette>
          <BaseEtiquette v-for="i in entree.issues" :key="i">#{{ i }}</BaseEtiquette>
          <BaseEtiquette
            v-for="(valeur, cle) in entree.autres"
            :key="cle"
            teinte="warn"
            :title="`Champ propre à cairn-wms : ${cle}`"
          >{{ cle }} : {{ valeur }}</BaseEtiquette>
        </div>

        <!-- eslint-disable-next-line vue/no-v-html -- HTML produit par markdown-it,
             sans HTML brut du document : fiche 0004, éprouvé dans test/markdown.spec.ts -->
        <article v-if="ouverte === entree.fichier" class="prose" v-html="entree.html" />
      </BaseCard>
    </template>
  </ZonePrincipale>
</template>

<style scoped>
.tete {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4) var(--sp-6);
  padding: 2px 2px 0;
}

.gauche {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
}

.section {
  font-size: var(--fs-section);
  font-weight: 600;
  letter-spacing: -0.02em;
}

.filtres {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.objectif {
  color: var(--c-muted);
  font-size: var(--fs-base);
  line-height: 1.5;
}

.reperes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.prose {
  padding-top: var(--sp-4);
  border-top: 1px solid var(--c-border);
  color: var(--c-text);
  font-size: var(--fs-base);
  line-height: 1.65;
}

.prose :deep(h1),
.prose :deep(h2),
.prose :deep(h3) {
  margin: var(--sp-5) 0 var(--sp-2);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.prose :deep(h1) {
  font-size: var(--fs-card);
}

.prose :deep(h2) {
  font-size: var(--fs-tuile);
}

.prose :deep(h3) {
  font-size: var(--fs-base);
}

.prose :deep(h1:first-child) {
  margin-top: 0;
}

.prose :deep(p),
.prose :deep(ul),
.prose :deep(ol) {
  margin: 0 0 var(--sp-3);
  color: var(--c-muted);
}

.prose :deep(ul),
.prose :deep(ol) {
  padding-left: 22px;
}

.prose :deep(strong) {
  color: var(--c-text);
  font-weight: 600;
}

.prose :deep(a) {
  color: var(--c-info);
}

.prose :deep(code) {
  padding: 1px 5px;
  border-radius: var(--r-touche);
  background: var(--c-tile);
  color: var(--c-text);
  font-family: var(--font-mono);
  font-size: var(--fs-sous);
}

.prose :deep(table) {
  display: block;
  overflow-x: auto;
  margin: 0 0 var(--sp-3);
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
}

.prose :deep(td) {
  color: var(--c-muted);
}
</style>
