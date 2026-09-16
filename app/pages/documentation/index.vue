<script setup lang="ts">
// L'arborescence de la documentation de cairn-wms — tranche 2.
// Rien n'est recopié ni conservé : l'arbre est relu à chaque affichage, pour
// qu'une modification poussée sur `dev` soit visible sans redéployer.
import { MESSAGES } from '~~/server/utils/echec-doc'
import type { EchecDoc, Groupe } from '~~/server/utils/doc-github'

definePageMeta({ titre: 'Documentation' })
useHead({ title: 'Cairn Dashboard — documentation' })

const { data } = await useFetch<{
  depot?: string
  branche?: string
  groupes?: Groupe[]
  echec?: EchecDoc
}>('/api/doc/arbre', { default: () => ({}) })

const echec = computed(() => data.value?.echec ?? null)
const groupes = computed(() => data.value?.groupes ?? [])
const total = computed(() => groupes.value.reduce((n, g) => n + g.documents.length, 0))

function libelleDossier(dossier: string | null): string {
  return dossier ?? 'À la racine'
}
</script>

<template>
  <div class="colonne">
    <BaseCard
      v-if="echec"
      titre="Documentation"
      :sous-titre="`Lue dans ${data?.depot ?? 'cairn-wms'}`"
    >
      <EtatEchec :titre="MESSAGES[echec].titre" :detail="MESSAGES[echec].detail" />
    </BaseCard>

    <template v-else>
      <BaseCard
        titre="Documentation de cairn-wms"
        :sous-titre="`${total} documents, lus sur la branche ${data?.branche ?? 'dev'}`"
        mention="Source de vérité"
      >
        <p>
          Ces documents sont lus dans le dépôt cairn-wms à chaque affichage. Le dashboard
          n'en conserve aucune copie : ce que vous lisez ici est ce qui s'y trouve.
        </p>
      </BaseCard>

      <div class="grille">
        <BaseCard
          v-for="groupe in groupes"
          :key="groupe.dossier ?? 'racine'"
          :titre="libelleDossier(groupe.dossier)"
          :mention="`${groupe.documents.length}`"
        >
          <ul class="liste">
            <li v-for="doc in groupe.documents" :key="doc.chemin">
              <NuxtLink class="document" :to="`/documentation/${doc.chemin}`">
                <span class="jeton"><AppIcone nom="documentation" /></span>
                <span class="nom">{{ doc.nom }}</span>
              </NuxtLink>
            </li>
          </ul>
        </BaseCard>
      </div>
    </template>
  </div>
</template>

<style scoped>
.colonne {
  display: flex;
  flex-direction: column;
  gap: var(--sp-grille);
}

.grille {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(258px, 1fr));
  gap: var(--sp-grille);
}

.liste {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.document {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: 8px var(--sp-4);
  border-radius: var(--r-tile);
  background: var(--c-tile);
  color: var(--c-text);
  font-size: var(--fs-md);
}

.document:hover {
  background: var(--c-card);
  color: var(--c-text);
}

/* Surtout pas « .icone » : le style de cette page atteint aussi l'élément racine
   du composant d'icône, qui porte ce nom — ses dimensions s'en trouveraient
   écrasées. */
.jeton {
  display: grid;
  flex: none;
  place-items: center;
  width: 22px;
  height: 22px;
  color: var(--c-muted);
}

.nom {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
