<script setup lang="ts">
// Page d'accueil de la tranche 1a : gabarit statique.
// Aucune donnée, aucun appel à GitHub — condition de l'écart temporaire au
// cadrage (principe 4) tant que la connexion n'est pas livrée (tranche 1b).
useHead({ title: 'Cairn Dashboard — vue d\'ensemble' })

const aVenir = [
  { tranche: '1b', texte: 'Connexion GitHub, réservée au compte propriétaire.' },
  { tranche: '2', texte: 'Consultation de la documentation de cairn-wms.' },
  { tranche: '3', texte: 'Avancement, lu dans le suivi de cairn-wms.' },
  { tranche: '4', texte: 'Tickets : liste, filtres et création.' },
  { tranche: '5', texte: 'Journal et fil d\'activité en direct.' },
  { tranche: '6', texte: 'Événements des sessions Claude Code dans le fil.' },
  { tranche: '7', texte: 'Connecteur MCP, pour Claude Chat et Cowork.' },
  { tranche: '8', texte: 'Déploiements de cairn-wms, déclenchés et suivis.' },
]
</script>

<template>
  <div class="colonnes">
    <BaseCard titre="Ce site" mention="Tranche 1a">
      <p>
        Interface de suivi du projet Cairn WMS. Elle lit et écrit dans GitHub :
        le dépôt cairn-wms reste la source de vérité, ce site n'en est qu'une vue.
      </p>
      <p class="second">
        Cette première tranche pose l'ossature, le thème et la mise en ligne.
        Elle n'affiche encore aucune donnée.
      </p>
    </BaseCard>

    <BaseCard titre="Ce qui vient ensuite" mention="Une tranche à la fois">
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
.colonnes {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}

.second {
  margin-top: var(--sp-3);
}

.liste {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.liste li {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--c-border);
  border-radius: var(--r-tile);
  background: var(--c-tile);
}

.puce {
  flex: none;
  min-width: 26px;
  padding: 2px var(--sp-2);
  border-radius: var(--r-chip);
  background: var(--c-card);
  color: var(--c-dim);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  text-align: center;
}
</style>
