<script setup lang="ts">
// L'avancement de cairn-wms — tranche 3, sur les briques du design.
//
// Les couches et les modules paraissent dans l'ordre du fichier, jamais
// réordonnés : c'est cairn-wms qui décide de sa progression. Les états sont les
// siens — « spécifié » n'existe pas chez nous — et un état que nous ne
// connaissons pas est signalé, jamais rangé d'office (issue #3).
import { MESSAGES } from '~~/server/utils/echec-doc'
import type { Avancement, Module } from '~~/server/utils/avancement'
import type { EchecDoc } from '~~/server/utils/doc-github'

definePageMeta({ titre: 'Avancement' })
useHead({ title: 'Cairn Dashboard — avancement' })

const { data } = await useFetch<Avancement & {
  depot?: string
  branche?: string
  compte?: { total: number, parEtat: Record<string, number>, inconnus: number }
  echec?: EchecDoc
  raison?: string
}>('/api/avancement', { key: 'avancement', default: () => ({ projet: null, misAJourLe: null, couches: [] }) })

const echec = computed(() => data.value?.echec ?? null)
const couches = computed(() => data.value?.couches ?? [])
const compte = computed(() => data.value?.compte ?? null)

/** Les états de cairn-wms, dans l'ordre de son cycle de vie. */
const ORDRE = ['à faire', 'spécifié', 'en développement', 'livré']

function classeEtat(module: Module): string {
  if (module.etat === null) return 'etat--inconnu'
  return `etat--${ORDRE.indexOf(module.etat)}`
}

function lienIssue(numero: number | null): string | null {
  if (numero === null || !data.value?.depot) return null
  return `https://github.com/${data.value.depot}/issues/${numero}`
}

const lienSuivi = computed(() => (data.value?.depot
  ? `https://github.com/${data.value.depot}/blob/${data.value.branche ?? 'dev'}/status.yml`
  : null))
</script>

<template>
  <ZonePrincipale>
    <BaseCard v-if="echec" titre="Avancement de Cairn WMS" sous-titre="lu dans son suivi">
      <EtatEchec :titre="MESSAGES[echec].titre" :detail="MESSAGES[echec].detail" />
      <p v-if="data?.raison" class="raison">{{ data.raison }}</p>
    </BaseCard>

    <template v-else>
      <BaseCard
        :titre="data?.projet ?? 'Avancement'"
        :compte="compte?.total"
        :sous-titre="`suivi mis à jour le ${data?.misAJourLe ?? '—'}`"
      >
        <template #lien>
          <LienChevron v-if="lienSuivi" :href="lienSuivi">GitHub</LienChevron>
        </template>

        <div v-if="compte" class="etats">
          <BaseTuile
            v-for="etat in ORDRE"
            :key="etat"
            compacte
            :libelle="etat"
            :valeur="String(compte.parEtat[etat] ?? 0)"
          />
          <BaseTuile
            v-if="compte.inconnus > 0"
            compacte
            teinte="alerte"
            libelle="état inconnu"
            :valeur="String(compte.inconnus)"
          />
        </div>
      </BaseCard>

      <BaseCard
        v-for="couche in couches"
        :key="couche.id"
        :titre="couche.jalon ?? couche.nom"
        :compte="couche.modules.length"
      >
        <LigneListe
          v-for="module in couche.modules"
          :key="module.id"
          :titre="`${module.id} — ${module.nom}`"
          :sous="module.etat ?? `état inconnu : « ${module.etatBrut || 'absent'} »`"
          :courant="module.etat === 'en développement'"
        >
          <template #icone>
            <span class="pastille" :class="classeEtat(module)" />
          </template>
          <template #droite>
            <span class="liens">
              <NuxtLink
                v-if="module.doc"
                class="lien"
                :to="`/documentation/${module.doc}`"
                :title="`Documentation du module ${module.id}`"
              >doc</NuxtLink>
              <NuxtLink
                class="lien"
                :to="`/tickets?module=${module.id}`"
                :title="`Tickets du module ${module.id}`"
              >tickets</NuxtLink>
              <a
                v-if="lienIssue(module.issue)"
                class="lien"
                :href="lienIssue(module.issue) ?? undefined"
                target="_blank"
                rel="nofollow noopener noreferrer"
                :title="`Issue GitHub du module ${module.id}`"
              >#{{ module.issue }}</a>
            </span>
          </template>
        </LigneListe>
      </BaseCard>
    </template>
  </ZonePrincipale>
</template>

<style scoped>
.raison {
  color: var(--c-dim);
  font-size: var(--fs-sm);
}

.etats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: var(--sp-4);
}

/* Dans le disque, le point d'état du module, aux couleurs des états. */
.pastille {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-dim);
}

.etat--1 {
  background: var(--c-info);
}

.etat--2 {
  background: var(--c-sur-accent);
}

.etat--3 {
  background: var(--c-ok);
}

.etat--inconnu {
  background: var(--c-warn);
}

.liens {
  display: flex;
  gap: var(--sp-2);
}

/* La touche du design (« ⌘K ») porte les petits liens d'une ligne. */
.lien {
  padding: 2px 6px;
  border: 1px solid var(--c-border);
  border-radius: var(--r-touche);
  color: var(--c-muted);
  font-size: var(--fs-xs);
}

.lien:hover {
  border-color: var(--c-accent-survol);
  color: var(--c-text);
}

@media (max-width: 640px) {
  .liens {
    flex-wrap: wrap;
  }
}
</style>
