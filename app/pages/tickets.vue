<script setup lang="ts">
// Tickets de cairn-wms — tranche 4.
//
// La création est la première écriture du dashboard, et elle est **guidée** :
// on choisit une nature et un module, le reste se déduit. Le label de couche et
// le jalon viennent du module, pour que tout ticket créé se range comme
// cairn-wms range les siens — et l'aperçu montre, avant l'envoi, ce qui sera
// réellement posé.
import { MESSAGES } from '~~/server/utils/echec-doc'
import { ECHECS_CREATION, filtrer, REFUS } from '~~/server/utils/tickets'
import { deduire, REFUS_COHERENCE } from '~~/server/utils/organisation'
import type { Nature, Organisation } from '~~/server/utils/organisation'
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
  organisation?: Organisation | null
  echec?: EchecDoc
}>('/api/tickets', { default: () => ({}) })

const echec = computed(() => data.value?.echec ?? null)
const familles = computed<Familles>(() => data.value?.familles ?? { couches: [], modules: [], types: [] })
const organisation = computed(() => data.value?.organisation ?? null)

// — Liste et filtres ————————————————————————————————————————

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

// — Création guidée —————————————————————————————————————————

function nouvelleIntention(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 14)}`
}

const brouillon = reactive({
  titre: '',
  corps: '',
  nature: 'tech' as Nature,
  module: '' as string,
})

const intention = ref(nouvelleIntention())
const envoiEnCours = ref(false)
const cree = ref<{ numero: number, url: string, labels: string[], jalon: string | null } | null>(null)
const refus = ref<string | null>(null)

/** Ce qui sera posé : calculé ici pour l'aperçu, recalculé et vérifié par le serveur. */
const apercu = computed(() => {
  const org = organisation.value
  if (!org) return null
  return deduire(brouillon.nature, brouillon.module === '' ? null : brouillon.module, org)
})

async function creer() {
  if (envoiEnCours.value) return
  envoiEnCours.value = true
  refus.value = null

  try {
    const reponse = await $fetch<{
      numero?: number
      url?: string
      labels?: string[]
      jalon?: string | null
    }>('/api/tickets', {
      method: 'POST',
      body: {
        titre: brouillon.titre,
        corps: brouillon.corps,
        nature: brouillon.nature,
        module: brouillon.module === '' ? null : brouillon.module,
        labels: apercu.value?.labels,
        jalonNumero: apercu.value?.jalonNumero,
        intention: intention.value,
      },
    })

    if (reponse.numero && reponse.url) {
      cree.value = {
        numero: reponse.numero,
        url: reponse.url,
        labels: reponse.labels ?? [],
        jalon: reponse.jalon ?? null,
      }
      brouillon.titre = ''
      brouillon.corps = ''
      intention.value = nouvelleIntention()
      await refresh()
    }
  }
  catch (erreur) {
    const d = (erreur as { data?: { echec?: string, refus?: string, detail?: string } })?.data

    if (d?.echec === 'coherence' && d.refus && d.refus in REFUS_COHERENCE) {
      refus.value = REFUS_COHERENCE[d.refus as keyof typeof REFUS_COHERENCE]
    }
    else if (d?.echec === 'brouillon' && d.refus) {
      refus.value = REFUS[d.refus as RefusCreation] + (d.detail ? ` (« ${d.detail} »)` : '')
    }
    else if (d?.echec === 'origine' || d?.echec === 'intention') {
      refus.value = 'La demande n\'a pas pu être vérifiée. Rechargez la page et recommencez.'
    }
    else if (d?.echec && d.echec in ECHECS_CREATION) {
      refus.value = ECHECS_CREATION[d.echec as EchecCreation].detail
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
    <BaseCard v-if="echec" titre="Tickets" sous-titre="Lus dans cairn-wms">
      <EtatEchec :titre="MESSAGES[echec].titre" :detail="MESSAGES[echec].detail" />
    </BaseCard>

    <template v-else>
      <BaseCard
        titre="Nouveau ticket"
        sous-titre="La couche et le jalon se déduisent du module"
        mention="Écriture"
      >
        <EtatVide
          v-if="!organisation"
          message="Le suivi de cairn-wms n'a pas pu être lu."
          mention="Sans lui, la couche et le jalon d'un module ne peuvent pas être déduits."
        />

        <form v-else class="formulaire" @submit.prevent="creer">
          <label class="champ">
            <span class="etiquette">Titre</span>
            <input v-model="brouillon.titre" type="text" maxlength="256" required>
          </label>

          <label class="champ">
            <span class="etiquette">Description <span class="facultatif">facultative</span></span>
            <textarea v-model="brouillon.corps" rows="3" maxlength="20000" />
          </label>

          <div class="deux">
            <label class="champ">
              <span class="etiquette">Nature</span>
              <select v-model="brouillon.nature">
                <option v-for="n in organisation.natures" :key="n" :value="n">{{ n }}</option>
              </select>
            </label>

            <label class="champ">
              <span class="etiquette">Module</span>
              <select v-model="brouillon.module">
                <option value="">Aucun module</option>
                <optgroup v-for="couche in organisation.couches" :key="couche.id" :label="couche.nom">
                  <option v-for="m in couche.modules" :key="m.id" :value="m.id">
                    {{ m.id }} — {{ m.nom }}
                  </option>
                </optgroup>
              </select>
            </label>
          </div>

          <div v-if="apercu" class="apercu">
            <span class="etiquette">Ce qui sera posé</span>
            <div class="pose">
              <span v-for="label in apercu.labels" :key="label" class="tag tag--pose">{{ court(label) }}</span>
              <span v-if="apercu.jalon" class="tag tag--jalon">{{ apercu.jalon }}</span>
              <span v-else class="tag tag--vide">aucun jalon</span>
            </div>
          </div>

          <p v-if="refus" class="refus" role="alert">{{ refus }}</p>

          <p v-if="cree" class="confirme" role="status">
            Ticket
            <a :href="cree.url" target="_blank" rel="nofollow noopener noreferrer">#{{ cree.numero }}</a>
            créé dans cairn-wms<span v-if="cree.jalon"> — jalon « {{ cree.jalon }} »</span>.
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
  flex: 1;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 0;
}

.deux {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-4);
}

.etiquette {
  color: var(--c-muted);
  font-size: var(--fs-sm);
}

.facultatif {
  color: var(--c-dim);
}

input[type='text'],
textarea,
select {
  padding: 8px var(--sp-4);
  border: 1px solid var(--c-border);
  border-radius: var(--r-tile);
  background: var(--c-tile);
  color: var(--c-text);
  font-family: var(--font-sans);
  font-size: var(--fs-md);
}

textarea {
  resize: vertical;
}

input[type='text']:focus-visible,
textarea:focus-visible,
select:focus-visible {
  border-color: var(--c-info);
}

.apercu {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-tile);
  background: var(--c-tile);
}

.pose {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.tag--pose {
  background: var(--c-card);
  color: var(--c-text);
}

.tag--jalon {
  background: var(--c-marque-fond);
  color: var(--c-info);
}

.tag--vide {
  color: var(--c-dim);
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

.filtres select {
  padding: 6px var(--sp-3);
  border-radius: var(--r-chip);
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
