<script setup lang="ts">
// Tickets de cairn-wms — tranche 4, sur les briques du design.
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
}>('/api/tickets', { key: 'tickets', default: () => ({}) })

const echec = computed(() => data.value?.echec ?? null)
const familles = computed<Familles>(() => data.value?.familles ?? { couches: [], modules: [], types: [] })
const organisation = computed(() => data.value?.organisation ?? null)

// — Liste et filtres ————————————————————————————————————————

/** Un module arrive par son identifiant (`1.2`) depuis l'avancement, ou par son label. */
function moduleDemande(): string | null {
  const brut = typeof route.query.module === 'string' ? route.query.module : null
  if (!brut) return null
  if (brut.startsWith('module/')) return brut
  return familles.value.modules.find(m => m.startsWith(`module/${brut}-`)) ?? null
}

const filtres = reactive<Filtres>({
  etat: 'open',
  couche: null,
  module: moduleDemande(),
  type: null,
})

const visibles = computed(() => filtrer(data.value?.tickets ?? [], filtres))

function court(label: string): string {
  return label.replace(/^(couche|module)\//, '')
}

function sousTicket(t: Ticket): string {
  const morceaux = [`#${t.numero}`, ...t.types]
  if (t.module) morceaux.push(court(t.module))
  if (t.commentaires > 0) morceaux.push(`${t.commentaires} commentaire${t.commentaires > 1 ? 's' : ''}`)
  return morceaux.join(' · ')
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
  <ZonePrincipale>
    <BaseCard v-if="echec" titre="Tickets" sous-titre="lus dans cairn-wms">
      <EtatEchec :titre="MESSAGES[echec].titre" :detail="MESSAGES[echec].detail" />
    </BaseCard>

    <template v-else>
      <section class="cartes">
        <BaseCard titre="Tickets" :compte="visibles.length" class="liste">
          <template #lien>
            <LienChevron :href="`https://github.com/${data?.depot ?? 'LucasLH1/cairn-wms'}/issues`">GitHub</LienChevron>
          </template>

          <div class="filtres">
            <select v-model="filtres.etat" class="filtre" aria-label="État">
              <option value="open">Ouverts</option>
              <option value="closed">Fermés</option>
              <option value="tous">Tous</option>
            </select>
            <select v-model="filtres.couche" class="filtre" aria-label="Couche">
              <option :value="null">Toutes les couches</option>
              <option v-for="c in familles.couches" :key="c" :value="c">{{ court(c) }}</option>
            </select>
            <select v-model="filtres.module" class="filtre" aria-label="Module">
              <option :value="null">Tous les modules</option>
              <option v-for="m in familles.modules" :key="m" :value="m">{{ court(m) }}</option>
            </select>
            <select v-model="filtres.type" class="filtre" aria-label="Nature">
              <option :value="null">Toutes natures</option>
              <option v-for="t in familles.types" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>

          <template v-if="visibles.length">
            <LigneListe
              v-for="ticket in visibles"
              :key="ticket.numero"
              :href="ticket.url"
              :titre="ticket.titre"
              :sous="sousTicket(ticket)"
              :courant="ticket.etat === 'open' && ticket.types.includes('bug')"
            >
              <template v-if="ticket.etat === 'closed'" #droite>
                <BaseEtiquette>fermé</BaseEtiquette>
              </template>
            </LigneListe>
          </template>

          <EtatVide
            v-else
            message="Aucun ticket ne correspond à ces filtres."
            mention="Modifiez l'état, la couche, le module ou la nature."
          />
        </BaseCard>

        <BaseCard titre="Nouveau ticket" mention="Écriture" class="creation">
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

            <BaseTuile v-if="apercu" libelle="Ce qui sera posé">
              <div class="pose">
                <BaseEtiquette v-for="label in apercu.labels" :key="label" teinte="accent">{{ court(label) }}</BaseEtiquette>
                <BaseEtiquette v-if="apercu.jalon" teinte="info">{{ apercu.jalon }}</BaseEtiquette>
                <BaseEtiquette v-else>aucun jalon</BaseEtiquette>
              </div>
            </BaseTuile>

            <BaseTuile v-if="refus" teinte="alerte" libelle="Refusé" role="alert">{{ refus }}</BaseTuile>

            <BaseTuile v-if="cree" teinte="info" libelle="Créé dans cairn-wms" role="status">
              Ticket
              <a :href="cree.url" target="_blank" rel="nofollow noopener noreferrer">#{{ cree.numero }}</a><span v-if="cree.jalon"> — jalon « {{ cree.jalon }} »</span>.
            </BaseTuile>

            <BoutonPrimaire type="submit" :disabled="envoiEnCours || brouillon.titre.trim() === ''">
              {{ envoiEnCours ? 'Création…' : 'Créer le ticket' }}
            </BoutonPrimaire>
          </form>
        </BaseCard>
      </section>
    </template>
  </ZonePrincipale>
</template>

<style scoped>
.cartes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  align-items: start;
  gap: var(--sp-grille);
}

/* La liste prend deux parts, la création une : la lecture d'abord. */
@media (min-width: 1080px) {
  .cartes {
    grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
  }
}

.filtres {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
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

.pose {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-top: var(--sp-1);
}
</style>
