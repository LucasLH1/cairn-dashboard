<script setup lang="ts">
// Les barres d'activité du design : des tuiles qui s'estompent vers le bas,
// remplies à proportion, la courante teintée d'accent ; dessous, le libellé et
// la valeur, en accent.
defineProps<{
  barres: Array<{
    cle: string
    libelle: string
    valeur: string
    /** Le remplissage, de 0 à 1. */
    part: number
    courant?: boolean
  }>
}>()
</script>

<template>
  <div class="barres" :style="{ '--colonnes': barres.length }">
    <div
      v-for="barre in barres"
      :key="barre.cle"
      class="barre"
      :class="{ 'barre--courante': barre.courant }"
    >
      <div class="remplissage" :style="{ height: `${Math.round(barre.part * 100)}%` }" />
    </div>
  </div>
  <div class="libelles" :style="{ '--colonnes': barres.length }">
    <div v-for="barre in barres" :key="barre.cle" :class="{ courant: barre.courant }">
      {{ barre.libelle }} <span class="valeur">{{ barre.valeur }}</span>
    </div>
  </div>
</template>

<style scoped>
.barres,
.libelles {
  display: grid;
  grid-template-columns: repeat(var(--colonnes), 1fr);
  gap: 6px;
}

.barres {
  height: 88px;
}

.barre {
  display: flex;
  align-items: flex-end;
  border-radius: var(--r-tuile);
  background: var(--g-barre);
}

.barre--courante {
  border: 1px solid var(--c-accent-bord);
  background: var(--c-accent-barre-fond);
}

.remplissage {
  width: 100%;
  border-radius: var(--r-tuile);
  background: var(--c-tile);
}

.barre--courante .remplissage {
  background: var(--c-accent-barre);
}

.libelles {
  color: var(--c-muted);
  font-size: var(--fs-sm);
  text-align: center;
}

.libelles .courant {
  color: var(--c-text);
}

.valeur {
  color: var(--c-accent-soft);
}
</style>
