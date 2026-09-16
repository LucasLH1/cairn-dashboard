<script setup lang="ts">
// Tickets de cairn-wms — tranche 4.
//
// La création est la première écriture du dashboard. Elle est bornée : titre
// obligatoire, corps facultatif, et **uniquement des labels qui existent déjà**
// dans cairn-wms — le dashboard n'en crée pas.
import { MESSAGES } from '~~/server/utils/echec-doc'
import { ECHECS_CREATION, filtrer, REFUS } from '~~/server/utils/tickets'
import type { EchecCreation, Familles, Filtres, RefusCreation, Ticket } from '~~/server/utils/tickets'
import type { EchecDoc } from '~~/server/utils/doc-github'

definePageMeta({ titre: 'Tickets' })
useHead({ title: 'Cairn Dashboard — tickets' })

const route = useRoute()

const { data, refresh } = await useFetch<{
  depot?: string
  familles?: Familles
  labels?: string[]
  tickets?: Ticket[]
  echec?: EchecDoc
}>('/api/tickets', { default: () => ({}) })

const echec = computed(() => data.value?.echec ?? null)
const familles = computed<Familles>(() => data.value?.familles ?? { couches: [], modules: [], types: [] })

// Le filtre par module peut venir de l'écran d'avancement.
const filtres = reactive<Filtres>({
  etat: 'open',
  couche: null,
  module: typeof route.query.module === 'string' ? route.query.module : null,
  type: null,
})

const visibles = computed(() => filtrer(data.value?.tickets ?? [], filtres))

function court(label: string): string {
  return label.replace(/^(couche|module)\//, '')
}

// — Création ———————————————————————————————————————————————

/** Une intention par formulaire : deux envois de la même n'écrivent qu'une fois. */
function nouvelleIntention(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 14)}`
}

const brouillon = reactive({ titre: '', corps: '', labels: [] as string[] })
const intention = ref(nouvelleIntention())
const envoiEnCours = ref(false)
const cree = ref<{ numero: number, url: string } | null>(null)
const refus = ref<string | null>(null)

async function creer() {
  if (envoiEnCours.value) return
  envoiEnCours.value = true
  refus.value = null

  try {
    const reponse = await $fetch<{
      numero?: number
      url?: string
      echec?: string
      refus?: RefusCreation
      detail?: string
    }>('/api/tickets', {
      method: 'POST',
      body: { ...brouillon, intention: intention.value },
    })

    if (reponse.numero && reponse.url) {
      cree.value = { numero: reponse.numero, url: reponse.url }
      brouillon.titre = ''
      brouillon.corps = ''
      brouillon.labels = []
      intention.value = nouvelleIntention()
      await refresh()
    }
  }
  catch (erreur) {
    const donnees = (erreur as { data?: { echec?: string, refus?: RefusCreation, detail?: string } })?.data
    if (donnees?.refus) {
      refus.value = REFUS[donnees.refus] + (donnees.detail ? ` (« ${donnees.detail} »)` : '')
    }
    else if (donnees?.echec === 'origine' || donnees?.echec === 'intention') {
      refus.value = 'La demande n\'a pas pu être vérifiée. Rechargez la page et recommencez.'
    }
    else if (donnees?.echec && donnees.echec in ECHECS_CREATION) {
      refus.value = ECHECS_CREATION[donnees.echec as EchecCreation].detail
    }
    else {
      refus.value = 'La création a échoué. Rien n\'a été écrit.'
    }
  }
  finally {
    envoiEnCours.value = false
  }
}
</script>

<template>
  <div class="colonne">
    <BaseCard
      v-if="echec"
      titre="Tickets"
      sous-titre="Lus dans cairn-wms"
    >
      <EtatEchec :titre="MESSAGES[echec].titre" :detail="MESSAGES[echec].detail" />
    </BaseCard>

    <template v-else>
      <BaseCard
        titre="Nouveau ticket"
        sous-titre="Créé dans cairn-wms, avec ses labels existants"
        mention="Écriture"
      >
        <form class="formulaire" @submit.prevent="creer">
          <label class="champ">
            <span class="etiquette">Titre</span>
            <input v-model="brouillon.titre" type="text" maxlength="256" required>
          </label>

          <label class="champ">
            <span class="etiquette">Description <span class="facultatif">facultative</span></span>
            <textarea v-model="brouillon.corps" rows="3" maxlength="20000" />
          </label>

          <fieldset class="labels">
            <legend class="etiquette">Labels</legend>
            <label v-for="label in [...familles.types, ...familles.couches, ...familles.modules]" :key="label" class="puce">
              <input v-model="brouillon.labels" type="checkbox" :value="label">
              <span>{{ court(label) }}</span>
            </label>
          </fieldset>

          <p v-if="refus" class="refus" role="alert">{{ refus }}</p>

          <p v-if="cree" class="confirme" role="status">
            Ticket
            <a :href="cree.url" target="_blank" rel="nofollow noopener noreferrer">#{{ cree.numero }}</a>
            créé dans cairn-wms.
          </p>

          <button type="submit" class="envoyer" :disabled="envoiEnCours || brouillon.titre.trim() === ''">
            {{ envoiEnCours ? 'Création…' : 'Créer le ticket' }}
          </button>
        </form>
      </BaseCard>

      <BaseCard
        titre="Tickets de cairn-wms"
        :sous-titre="`${visibles.length} sur ${data?.tickets?.length ?? 0}`"
        mention="Source de vérité"
      >
        <div class="filtres">
          <select v-model="filtres.etat" aria-label="État">
            <option value="open">Ouverts</option>
            <option value="closed">Fermés</option>
            <option value="tous">Tous</option>
          </select>
          <select v-model="filtres.couche" aria-label="Couche">
            <option :value="null">Toutes les couches</option>
            <option v-for="c in familles.couches" :key="c" :value="c">{{ court(c) }}</option>
          </select>
          <select v-model="filtres.module" aria-label="Module">
            <option :value="null">Tous les modules</option>
            <option v-for="m in familles.modules" :key="m" :value="m">{{ court(m) }}</option>
          </select>
          <select v-model="filtres.type" aria-label="Nature">
            <option :value="null">Toutes natures</option>
            <option v-for="t in familles.types" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>

        <ul v-if="visibles.length" class="liste">
          <li v-for="ticket in visibles" :key="ticket.numero" class="ticket">
            <span class="pastille" :class="ticket.etat === 'open' ? 'pastille--ouvert' : 'pastille--ferme'" aria-hidden="true" />
            <span class="identite">
              <span class="titre">{{ ticket.titre }}</span>
              <span class="etiquettes">
                <span v-for="label in ticket.labels" :key="label" class="tag">{{ court(label) }}</span>
              </span>
            </span>
            <a class="lien" :href="ticket.url" target="_blank" rel="nofollow noopener noreferrer">#{{ ticket.numero }}</a>
          </li>
        </ul>

        <EtatVide
          v-else
          message="Aucun ticket ne correspond à ces filtres."
          mention="Modifiez l'état, la couche, le module ou la nature."
        />
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

.formulaire {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.champ {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.etiquette {
  color: var(--c-muted);
  font-size: var(--fs-sm);
}

.facultatif {
  color: var(--c-dim);
}

input[type='text'],
textarea {
  padding: 8px var(--sp-4);
  border: 1px solid var(--c-border);
  border-radius: var(--r-tile);
  background: var(--c-tile);
  color: var(--c-text);
  font-family: var(--font-sans);
  font-size: var(--fs-md);
  resize: vertical;
}

input[type='text']:focus-visible,
textarea:focus-visible {
  border-color: var(--c-info);
}

.labels {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin: 0;
  padding: 0;
  border: 0;
}

.labels legend {
  margin-bottom: var(--sp-2);
  padding: 0;
}

.puce {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: 4px var(--sp-3);
  border-radius: var(--r-chip);
  background: var(--c-tile);
  color: var(--c-muted);
  font-size: var(--fs-xs);
}

.puce:has(input:checked) {
  background: var(--c-card);
  color: var(--c-text);
}

.envoyer {
  align-self: flex-start;
  padding: 8px var(--sp-5);
  border: 0;
  border-radius: var(--r-tile);
  background: var(--g-accent);
  box-shadow: var(--sh-accent);
  color: #ffffff;
  font-size: var(--fs-md);
  font-weight: 600;
}

.envoyer:disabled {
  background: var(--c-tile);
  box-shadow: none;
  color: var(--c-dim);
  cursor: not-allowed;
}

.refus {
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--c-alert);
  border-radius: var(--r-tile);
  color: var(--c-alert-soft);
  font-size: var(--fs-md);
}

.confirme {
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--c-ok);
  border-radius: var(--r-tile);
  color: var(--c-ok);
  font-size: var(--fs-md);
}

.filtres {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);
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

.liste {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.ticket {
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
}

.pastille--ouvert {
  background: var(--c-ok);
}

.pastille--ferme {
  background: var(--c-dim);
}

.identite {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.titre {
  color: var(--c-text);
  font-size: var(--fs-md);
}

.etiquettes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1);
}

.tag {
  padding: 1px var(--sp-2);
  border-radius: var(--r-chip);
  background: var(--c-card);
  color: var(--c-dim);
  font-size: var(--fs-xs);
}

.lien {
  flex: none;
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
  .ticket {
    flex-wrap: wrap;
  }
}
</style>
