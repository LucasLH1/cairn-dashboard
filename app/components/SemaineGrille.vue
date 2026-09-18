<script setup lang="ts">
// La grille de la semaine du design : une colonne par jour, un en-tête sur
// fond de tuile, des blocs à libellé pointé, titre et détail, une ligne de
// repères en dessous, et le jour courant teinté.
//
// Le design place aussi un axe des heures à gauche, que ses blocs ne suivent
// pas : ils s'empilent dans l'ordre. Ici les heures sont portées par les
// repères des blocs, et l'axe n'est pas repris — un axe que rien ne suit
// dirait faux.
import { NuxtLink } from '#components'

export interface BlocSemaine {
  cle: string
  etat: 'ok' | 'info' | 'alerte' | 'accent' | 'warn' | 'dim'
  libelle: string
  titre: string
  detail?: string
  reperes?: string[]
  enCours?: boolean
  to?: string
}

export interface JourSemaine {
  cle: string
  nom: string
  numero: string
  courant: boolean
  blocs: BlocSemaine[]
}

defineProps<{
  jours: JourSemaine[]
}>()
</script>

<template>
  <section class="grille" :style="{ '--colonnes': jours.length }">
    <div
      v-for="jour in jours"
      :key="jour.cle"
      class="jour"
      :class="{ 'jour--courant': jour.courant }"
    >
      <div class="entete">
        <span class="nom">{{ jour.nom }}</span>
        <span class="numero">{{ jour.numero }}</span>
      </div>

      <template v-for="bloc in jour.blocs" :key="bloc.cle">
        <component
          :is="bloc.to ? NuxtLink : 'div'"
          :to="bloc.to"
          class="bloc"
          :class="[`bloc--${bloc.etat}`, { 'bloc--en-cours': bloc.enCours }]"
        >
          <span class="libelle">
            <span class="point" :class="{ 'point--respire': bloc.enCours }" aria-hidden="true" />
            {{ bloc.libelle }}
          </span>
          <span class="titre">{{ bloc.titre }}</span>
          <span v-if="bloc.detail" class="detail">{{ bloc.detail }}</span>
        </component>
        <div v-if="bloc.reperes?.length" class="reperes">
          <span v-for="(repere, i) in bloc.reperes" :key="i">{{ repere }}</span>
        </div>
      </template>

      <div class="reste">
        <span v-if="jour.blocs.length === 0">Rien ce jour-là</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.grille {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(var(--colonnes), minmax(112px, 1fr));
  min-height: 340px;
  overflow-x: auto;
  border-top: 1px solid var(--c-border);
  border-left: 1px solid var(--c-border);
}

.jour {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-right: 1px solid var(--c-border);
}

.jour--courant {
  background: var(--c-alert-colonne);
}

.entete {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--sp-2);
  height: 30px;
  padding: 0 var(--sp-4);
  border-bottom: 1px solid var(--c-border);
  background: var(--c-tile);
}

.jour--courant .entete {
  border-bottom-color: var(--c-alert-filet);
  background: var(--c-alert-teinte);
}

.nom {
  color: var(--c-muted);
  font-size: var(--fs-sm);
}

.numero {
  font-size: var(--fs-md);
  font-weight: 500;
}

.jour--courant .nom,
.jour--courant .numero {
  color: var(--c-alert-soft);
}

.bloc {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  padding: 9px var(--sp-4);
  border-bottom: 1px solid var(--c-border);
  color: var(--c-text);
}

.bloc--alerte {
  background: var(--c-alert-bloc);
}

.bloc--info {
  background: var(--c-info-bloc);
}

.libelle {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  color: var(--c-muted);
  font-size: var(--fs-xs);
}

.bloc--alerte .libelle {
  color: var(--c-alert-soft);
}

.bloc--info .libelle {
  color: var(--c-info-soft);
}

.bloc--accent .libelle {
  color: var(--c-alert-soft);
}

.point {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-dim);
}

.bloc--ok .point {
  background: var(--c-ok);
}

.bloc--info .point {
  background: var(--c-info);
}

.bloc--alerte .point {
  background: var(--c-alert);
}

.bloc--accent .point {
  background: var(--c-accent);
}

.bloc--warn .point {
  background: var(--c-warn);
}

.point--respire {
  animation: respire 1.5s ease-in-out infinite;
}

@keyframes respire {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.3;
  }
}

.titre {
  font-size: var(--fs-base);
  font-weight: 500;
  line-height: 1.3;
}

.bloc--accent .titre {
  color: var(--c-accent-soft);
}

.detail {
  color: var(--c-muted);
  font-size: var(--fs-sm);
  line-height: 1.4;
}

.reperes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-4);
  padding: 7px var(--sp-4);
  border-bottom: 1px solid var(--c-border);
  color: var(--c-muted);
  font-size: var(--fs-xs);
}

.reste {
  flex: 1;
  padding: 9px var(--sp-4);
  background: var(--c-tile);
  color: var(--c-dim);
  font-size: var(--fs-sous);
}

.jour--courant .reste {
  background: transparent;
}
</style>
