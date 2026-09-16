<script setup lang="ts">
// L'avancement de cairn-wms — tranche 3.
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
}>('/api/avancement', { default: () => ({ projet: null, misAJourLe: null, couches: [] }) })

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
</script>

<template>
  <div class="colonne">
    <BaseCard
      v-if="echec"
      titre="Avancement de Cairn WMS"
      sous-titre="Lu dans son suivi"
    >
      <EtatEchec :titre="MESSAGES[echec].titre" :detail="MESSAGES[echec].detail" />
      <p v-if="data?.raison" class="raison">{{ data.raison }}</p>
    </BaseCard>

    <template v-else>
      <BaseCard
        :titre="data?.projet ?? 'Avancement'"
        :sous-titre="`${compte?.total ?? 0} modules · suivi mis à jour le ${data?.misAJourLe ?? '—'}`"
        mention="Source de vérité"
      >
        <ul v-if="compte" class="resume">
          <li v-for="etat in ORDRE" :key="etat" class="part">
            <span class="nombre">{{ compte.parEtat[etat] ?? 0 }}</span>
            <span class="libelle">{{ etat }}</span>
          </li>
          <li v-if="compte.inconnus > 0" class="part part--alerte">
            <span class="nombre">{{ compte.inconnus }}</span>
            <span class="libelle">état inconnu</span>
          </li>
        </ul>
      </BaseCard>

      <BaseCard
        v-for="couche in couches"
        :key="couche.id"
        :titre="couche.jalon ?? couche.nom"
        :mention="`${couche.modules.length}`"
      >
        <ul class="modules">
          <li v-for="module in couche.modules" :key="module.id" class="module">
            <span class="pastille" :class="classeEtat(module)" aria-hidden="true" />

            <span class="identite">
              <span class="nom">
                <span class="numero">{{ module.id }}</span>
                {{ module.nom }}
              </span>
              <span class="etat" :class="{ 'etat--signale': module.etat === null }">
                {{ module.etat ?? `état inconnu : « ${module.etatBrut || 'absent' } »` }}
              </span>
            </span>

            <span class="liens">
              <NuxtLink
                v-if="module.doc"
                class="lien"
                :to="`/documentation/${module.doc}`"
                :title="`Documentation du module ${module.id}`"
              >
                doc
              </NuxtLink>
              <a
                v-if="lienIssue(module.issue)"
                class="lien"
                :href="lienIssue(module.issue) ?? undefined"
                target="_blank"
                rel="nofollow noopener noreferrer"
                :title="`Issue GitHub du module ${module.id}`"
              >
                #{{ module.issue }}
              </a>
            </span>
          </li>
        </ul>
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

.raison {
  margin-top: var(--sp-3);
  color: var(--c-dim);
  font-size: var(--fs-sm);
}

.resume {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.part {
  display: flex;
  flex: 1 1 110px;
  flex-direction: column;
  gap: 2px;
  padding: 8px var(--sp-4);
  border-radius: var(--r-tile);
  background: var(--c-tile);
}

.part--alerte {
  color: var(--c-warn);
}

.nombre {
  color: var(--c-text);
  font-size: var(--fs-number);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.part--alerte .nombre {
  color: var(--c-warn);
}

.libelle {
  color: var(--c-muted);
  font-size: var(--fs-sm);
}

.modules {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.module {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: 8px var(--sp-4);
  border-radius: var(--r-tile);
  background: var(--c-tile);
}

.pastille {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c-dim);
}

.etat--1 {
  background: var(--c-info);
}

.etat--2 {
  background: var(--c-accent);
}

.etat--3 {
  background: var(--c-ok);
}

.etat--inconnu {
  background: var(--c-warn);
}

.identite {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.nom {
  display: flex;
  gap: var(--sp-2);
  min-width: 0;
  color: var(--c-text);
  font-size: var(--fs-md);
}

.numero {
  flex: none;
  color: var(--c-dim);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
}

.etat {
  color: var(--c-muted);
  font-size: var(--fs-sm);
}

.etat--signale {
  color: var(--c-warn);
}

.liens {
  display: flex;
  flex: none;
  gap: var(--sp-2);
}

.lien {
  padding: 2px var(--sp-3);
  border-radius: var(--r-chip);
  background: var(--c-card);
  color: var(--c-muted);
  font-size: var(--fs-xs);
}

.lien:hover {
  color: var(--c-text);
}

@media (max-width: 640px) {
  .module {
    flex-wrap: wrap;
  }
}
</style>
