<script setup lang="ts">
// Vue d'ensemble — socle de la tranche 1c : l'ossature et les composants du
// design, sans aucune donnée. Rien n'est lu chez GitHub ici : les écrans de
// données arrivent avec les tranches 2 et suivantes.
definePageMeta({ titre: 'Vue d\'ensemble' })
useHead({ title: 'Cairn Dashboard — vue d\'ensemble' })

// Vue d'ensemble de l'avancement de cairn-wms — tranche 3. La page d'accueil
// n'en montre que le compte ; le détail est sur son écran.
const { data: avancement } = await useFetch<{
  projet?: string | null
  compte?: { total: number, parEtat: Record<string, number>, inconnus: number }
  echec?: string
}>('/api/avancement', { default: () => ({}) })

const ORDRE = ['à faire', 'spécifié', 'en développement', 'livré']

const aVenir = [
  { tranche: '4', texte: 'Tickets : liste, filtres et création.' },
  { tranche: '5', texte: 'Journal et fil d\'activité en direct.' },
  { tranche: '6', texte: 'Événements des sessions Claude Code dans le fil.' },
  { tranche: '7', texte: 'Connecteur MCP, pour Claude Chat et Cowork.' },
  { tranche: '8', texte: 'Déploiements de cairn-wms, déclenchés et suivis.' },
]
</script>

<template>
  <div class="grille">
    <BaseCard
      titre="Ce site"
      sous-titre="Interface de suivi de Cairn WMS"
      mention="Socle"
    >
      <p>
        Le dépôt cairn-wms reste la source de vérité : ce site le lit et y écrit
        par GitHub, il n'en est qu'une vue.
      </p>
      <p class="second">
        La <NuxtLink to="/documentation">documentation de cairn-wms</NuxtLink> s'y
        consulte déjà, lue à la source à chaque affichage.
      </p>
    </BaseCard>

    <BaseCard
      v-if="avancement?.compte && !avancement?.echec"
      :titre="avancement.projet ?? 'Cairn WMS'"
      :sous-titre="`${avancement.compte.total} modules suivis`"
      mention="Avancement"
    >
      <ul class="resume">
        <li v-for="etat in ORDRE" :key="etat">
          <span class="nombre">{{ avancement.compte.parEtat[etat] ?? 0 }}</span>
          <span class="libelle">{{ etat }}</span>
        </li>
      </ul>
      <p class="second">
        <NuxtLink to="/avancement">Le détail, couche par couche</NuxtLink>
      </p>
    </BaseCard>

    <BaseCard
      titre="Activité"
      sous-titre="Fil des événements du projet"
    >
      <EtatVide
        message="Rien à afficher pour l'instant."
        mention="Le fil en direct arrive avec la tranche 5."
      />
    </BaseCard>

    <BaseCard
      titre="Ce qui vient ensuite"
      mention="Une tranche à la fois"
    >
      <ul class="liste">
        <li v-for="item in aVenir" :key="item.tranche">
          <span class="puce">{{ item.tranche }}</span>
          <span>{{ item.texte }}</span>
        </li>
      </ul>
    </BaseCard>
  </div>
</template>

<style scoped>
.grille {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(258px, 1fr));
  gap: var(--sp-grille);
}

.second {
  margin-top: var(--sp-3);
}

/* Vue d'ensemble de l'avancement : les nombres portent la lecture, à la taille
   que le design réserve aux valeurs mises en avant. */
.resume {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.resume li {
  display: flex;
  flex: 1 1 96px;
  flex-direction: column;
  gap: 2px;
  padding: 8px var(--sp-4);
  border-radius: var(--r-tile);
  background: var(--c-tile);
}

.nombre {
  color: var(--c-text);
  font-size: var(--fs-number);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.libelle {
  color: var(--c-muted);
  font-size: var(--fs-sm);
}

.liste {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.liste li {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: 8px var(--sp-4);
  border-radius: var(--r-tile);
  background: var(--c-tile);
}

.puce {
  flex: none;
  min-width: 22px;
  padding: 2px var(--sp-2);
  border-radius: var(--r-chip);
  background: var(--c-card);
  color: var(--c-dim);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  text-align: center;
}
</style>
