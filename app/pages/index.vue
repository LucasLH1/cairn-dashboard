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

// Fil d'activité — tranche 5. L'historique est chargé une fois ; les nouveautés
// arrivent ensuite par le WebSocket, sans sondage ni rechargement.
interface EvenementFil {
  livraison: string
  type: string
  titre: string | null
  auteur: string | null
}

const COMBIEN = 8

const { data: fil } = await useFetch<{
  evenements?: EvenementFil[]
  total?: number
  echec?: string
}>('/api/fil', { query: { limite: COMBIEN }, default: () => ({}) })

const evenements = ref<EvenementFil[]>([...(fil.value?.evenements ?? [])])

const { etat } = useFilDirect((recu) => {
  const e = recu as unknown as EvenementFil
  // Une livraison déjà présente ne doit pas apparaître deux fois : le serveur
  // ne diffuse que les nouveautés, mais une reconnexion peut recouper.
  evenements.value = [e, ...evenements.value.filter(x => x.livraison !== e.livraison)].slice(0, COMBIEN)
})

const libelleEtat = computed(() => {
  if (etat.value === 'ouvert') return 'en direct'
  if (etat.value === 'connexion') return 'connexion…'
  return 'hors ligne'
})

const aVenir = [
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
      :sous-titre="`Fil des événements du projet · ${libelleEtat}`"
      :mention="fil?.total ? String(fil.total) : undefined"
    >
      <EtatEchec
        v-if="fil?.echec"
        titre="Historique indisponible"
        detail="Le dashboard n'a pas pu lire son historique. Les événements reçus pendant ce temps ne sont pas perdus : ils sont écrits avant d'être affichés."
      />

      <ul v-else-if="evenements.length" class="fil">
        <li v-for="e in evenements" :key="e.livraison" class="evenement">
          <span class="pastille" :class="`pastille--${e.type}`" aria-hidden="true" />
          <span class="corps">
            <span class="ligne">{{ e.titre ?? e.type }}</span>
            <span class="meta">{{ e.type }}<span v-if="e.auteur"> · {{ e.auteur }}</span></span>
          </span>
        </li>
      </ul>

      <EtatVide
        v-else
        message="Aucun événement reçu pour l'instant."
        mention="Le fil se remplira au premier push, ticket ou déploiement sur cairn-wms."
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

/* Le fil d'activité : les briques du design — tuile, pastille d'état, texte
   secondaire — comme partout ailleurs. */
.fil {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.evenement {
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

.pastille--push {
  background: var(--c-info);
}

.pastille--issues {
  background: var(--c-accent);
}

.pastille--pull_request {
  background: var(--c-ok);
}

.pastille--workflow_run {
  background: var(--c-warn);
}

.corps {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ligne {
  overflow: hidden;
  color: var(--c-text);
  font-size: var(--fs-md);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  color: var(--c-dim);
  font-size: var(--fs-xs);
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
