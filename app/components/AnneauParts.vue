<script setup lang="ts">
// L'anneau de répartition du design : un dégradé conique à parts séparées
// d'un mince vide, un centre sur le fond de la colonne, et sa légende à points.
const props = defineProps<{
  parts: Array<{ cle: string, libelle: string, valeur: number, couleur: string }>
  centreValeur: string | number
  centreLibelle: string
}>()

const VIDE = 1.5

const total = computed(() => props.parts.reduce((n, p) => n + p.valeur, 0))

const pourcentages = computed(() => props.parts.map(p => ({
  ...p,
  pourcent: total.value === 0 ? 0 : Math.round((p.valeur / total.value) * 100),
})))

// Les parts se suivent dans l'ordre de la légende ; le vide qui les sépare est
// pris sur la fin de chacune, comme le fait le design.
const degrade = computed(() => {
  if (total.value === 0) return 'conic-gradient(var(--c-tile) 0 100%)'
  const arrets: string[] = []
  let depart = 0
  for (const part of props.parts) {
    if (part.valeur === 0) continue
    const fin = depart + (part.valeur / total.value) * 100
    const plein = Math.max(depart, fin - VIDE)
    arrets.push(`${part.couleur} ${depart}% ${plein}%`, `transparent ${plein}% ${fin}%`)
    depart = fin
  }
  return `conic-gradient(${arrets.join(', ')})`
})
</script>

<template>
  <div class="anneau">
    <div class="disque" :style="{ background: degrade }" aria-hidden="true">
      <div class="centre">
        <span class="centre-valeur">{{ centreValeur }}</span>
        <span class="centre-libelle">{{ centreLibelle }}</span>
      </div>
    </div>

    <ul class="legende">
      <li v-for="part in pourcentages" :key="part.cle">
        <span class="point" :style="{ background: part.couleur }" aria-hidden="true" />
        <span class="libelle">{{ part.libelle }}</span>
        <span class="part">{{ part.pourcent }} %</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.anneau {
  display: flex;
  align-items: center;
  gap: var(--sp-6);
}

.disque {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 90px;
  height: 90px;
  border-radius: 50%;
}

.centre {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 62px;
  height: 62px;
  border-radius: 50%;
  background: var(--c-side);
}

.centre-valeur {
  font-size: var(--fs-xl);
  font-weight: 600;
  line-height: 1;
}

.centre-libelle {
  color: var(--c-muted);
  font-size: var(--fs-xs);
}

.legende {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--sp-4);
  min-width: 0;
  margin: 0;
  padding: 0;
  font-size: var(--fs-base);
  list-style: none;
}

.legende li {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.point {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.libelle {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.part {
  margin-left: auto;
  color: var(--c-muted);
}
</style>
