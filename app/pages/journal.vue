<script setup lang="ts">
// Le journal de cairn-wms — tranche 5.
//
// Les entrées sont les siennes, dans son format : en-tête à `modules`, et des
// champs que nous ne connaissons pas — comme `annulee_par` — qui sont affichés
// tels quels plutôt qu'écartés.
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
</script>

<template>
  <div class="colonne">
    <BaseCard v-if="echec" titre="Journal" sous-titre="Lu dans cairn-wms">
      <EtatEchec :titre="MESSAGES[echec].titre" :detail="MESSAGES[echec].detail" />
    </BaseCard>

    <template v-else>
      <BaseCard
        titre="Journal de cairn-wms"
        :sous-titre="`${entrees.length} entrée(s) sur ${data?.total ?? 0}, lues sur la branche ${data?.branche ?? 'dev'}`"
        mention="Source de vérité"
      >
        <div class="filtres">
          <select v-model="module" aria-label="Module">
            <option value="">Tous les modules</option>
            <option v-for="m in citations.modules" :key="m" :value="m">{{ m }}</option>
          </select>
          <select v-model="issue" aria-label="Issue">
            <option value="">Toutes les issues</option>
            <option v-for="i in citations.issues" :key="i" :value="String(i)">#{{ i }}</option>
          </select>
        </div>

        <EtatVide
          v-if="entrees.length === 0"
          message="Aucune entrée ne correspond à ces filtres."
          mention="Les sessions se retrouvent par module ou par issue citée."
        />
      </BaseCard>

      <BaseCard
        v-for="entree in entrees"
        :key="entree.fichier"
        :titre="entree.sujet"
        :sous-titre="entree.date ?? entree.fichier"
      >
        <p v-if="entree.objectif" class="objectif">{{ entree.objectif }}</p>

        <div class="reperes">
          <span v-for="m in entree.modules" :key="m" class="tag tag--module">module {{ m }}</span>
          <span v-for="i in entree.issues" :key="i" class="tag">#{{ i }}</span>
          <span
            v-for="(valeur, cle) in entree.autres"
            :key="cle"
            class="tag tag--autre"
            :title="`Champ propre à cairn-wms : ${cle}`"
          >{{ cle }} : {{ valeur }}</span>
        </div>

        <button type="button" class="deplier" @click="basculer(entree.fichier)">
          {{ ouverte === entree.fichier ? 'Replier' : 'Lire l\'entrée' }}
        </button>

        <!-- eslint-disable-next-line vue/no-v-html -- HTML produit par markdown-it,
             sans HTML brut du document : fiche 0004, éprouvé dans test/markdown.spec.ts -->
        <article v-if="ouverte === entree.fichier" class="prose" v-html="entree.html" />
      </BaseCard>
    </template>
  </div>
</template>

<style scoped>
.colonne {
  display: flex;
  flex-direction: column;
  gap: var(--sp-grille);
}

.filtres {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

select {
  padding: 6px var(--sp-3);
  border: 1px solid var(--c-border);
  border-radius: var(--r-chip);
  background: var(--c-tile);
  color: var(--c-text);
  font-family: var(--font-sans);
  font-size: var(--fs-sm);
}

.objectif {
  color: var(--c-muted);
  font-size: var(--fs-md);
}

.reperes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1);
  margin-top: var(--sp-3);
}

.tag {
  padding: 1px var(--sp-2);
  border-radius: var(--r-chip);
  background: var(--c-tile);
  color: var(--c-dim);
  font-size: var(--fs-xs);
}

.tag--module {
  color: var(--c-info);
}

.tag--autre {
  color: var(--c-warn);
}

.deplier {
  align-self: flex-start;
  margin-top: var(--sp-4);
  padding: 4px var(--sp-4);
  border: 1px solid var(--c-border);
  border-radius: var(--r-chip);
  background: var(--c-tile);
  color: var(--c-muted);
  font-size: var(--fs-sm);
}

.deplier:hover {
  color: var(--c-text);
}

.prose {
  margin-top: var(--sp-4);
  padding-top: var(--sp-4);
  border-top: 1px solid var(--c-border);
  color: var(--c-muted);
  font-size: var(--fs-md);
  line-height: 1.65;
}

.prose :deep(h1),
.prose :deep(h2),
.prose :deep(h3) {
  margin: var(--sp-5) 0 var(--sp-3);
  color: var(--c-text);
  letter-spacing: -0.015em;
}

.prose :deep(h1) {
  font-size: var(--fs-card);
}

.prose :deep(h2) {
  font-size: var(--fs-lg);
}

.prose :deep(h3) {
  font-size: var(--fs-base);
}

.prose :deep(p),
.prose :deep(ul),
.prose :deep(ol) {
  margin: 0 0 var(--sp-3);
}

.prose :deep(ul),
.prose :deep(ol) {
  padding-left: var(--sp-6);
}

.prose :deep(strong) {
  color: var(--c-text);
}

.prose :deep(a) {
  color: var(--c-info);
}

.prose :deep(code) {
  padding: 1px 5px;
  border-radius: var(--r-chip);
  background: var(--c-tile);
  color: var(--c-text);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
}

.prose :deep(table) {
  display: block;
  overflow-x: auto;
  margin: 0 0 var(--sp-3);
  border-collapse: collapse;
  font-size: var(--fs-sm);
}

.prose :deep(th),
.prose :deep(td) {
  padding: var(--sp-1) var(--sp-3);
  border: 1px solid var(--c-border);
  text-align: left;
}
</style>
