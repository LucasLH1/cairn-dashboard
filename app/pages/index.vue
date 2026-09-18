<script setup lang="ts">
// Vue d'ensemble — la composition du « Tableau de bord » du design, sur les
// données réelles : trois cartes en tête, puis la semaine.
//
// Le design y met une session en cours et son minuteur, les issues du jour,
// les déploiements, puis une semaine de sessions planifiées. Ici, dans le même
// agencement (règle 7) : l'avancement de cairn-wms, ses derniers tickets, les
// dernières entrées de son journal, puis la semaine telle qu'elle a eu lieu —
// entrées de journal et sessions de travail réelles, jour par jour.
import { dateCourte, duree, heureDe, jourCourt, jourDe, joursDeLaSemaine, lireDateJournal } from '~/utils/temps'
import type { BlocSemaine, JourSemaine } from '~/components/SemaineGrille.vue'
import type { EntreeJournal } from '~~/server/utils/journal-wms'
import type { Ticket } from '~~/server/utils/tickets'

definePageMeta({ titre: 'Vue d\'ensemble' })
useHead({ title: 'Cairn Dashboard — vue d\'ensemble' })

// — L'avancement de cairn-wms — tranche 3 ————————————————————————————

const { data: avancement } = await useFetch<{
  projet?: string | null
  depot?: string
  couches?: unknown[]
  compte?: { total: number, parEtat: Record<string, number>, inconnus: number }
  echec?: string
}>('/api/avancement', { key: 'avancement', default: () => ({}) })

const ORDRE = ['à faire', 'spécifié', 'en développement', 'livré']

const compte = computed(() => (avancement.value?.echec ? null : avancement.value?.compte) ?? null)

/** La part des modules qui ont dépassé « à faire » : ce que le disque dit. */
const progression = computed(() => {
  const c = compte.value
  if (!c || c.total === 0) return null
  return Math.round(((c.total - (c.parEtat['à faire'] ?? 0) - c.inconnus) / c.total) * 100)
})

// — Les tickets — tranche 4 ——————————————————————————————————————————

const { data: tickets } = await useFetch<{
  depot?: string
  tickets?: Ticket[]
  echec?: string
}>('/api/tickets', { key: 'tickets', default: () => ({}) })

const ouverts = computed(() => (tickets.value?.tickets ?? []).filter(t => t.etat === 'open'))
const derniersTickets = computed(() => ouverts.value.slice(0, 3))

function sousTicket(t: Ticket): string {
  const morceaux = [`#${t.numero}`, ...t.types]
  if (t.module) morceaux.push(t.module.replace(/^module\//, ''))
  return morceaux.join(' · ')
}

// — Le journal — tranche 5 ————————————————————————————————————————————

const { data: journal } = await useFetch<{
  entrees?: EntreeJournal[]
  total?: number
  echec?: string
}>('/api/journal', { key: 'journal', default: () => ({}) })

const entrees = computed(() => journal.value?.entrees ?? [])
const dernieresEntrees = computed(() => entrees.value.slice(0, 4))

function sujetDe(entree: EntreeJournal): string {
  return entree.sujet.charAt(0).toUpperCase() + entree.sujet.slice(1)
}

function quandEntree(entree: EntreeJournal): string {
  const d = lireDateJournal(entree.date)
  return d ? `${dateCourte(d)} · ${heureDe(d)}` : entree.fichier
}

// — La semaine : journal et sessions, jour par jour ——————————————————

const { evenements } = useFil()

const portee = ref<'jour' | 'semaine'>('semaine')
const PORTEES = [
  { valeur: 'jour', libelle: 'Jour' },
  { valeur: 'semaine', libelle: 'Semaine' },
]

/** Une session est tenue pour en cours sans fin déclarée, tant qu'elle a parlé récemment. */
const SILENCE_MAX_MS = 30 * 60 * 1000

interface Session {
  cle: string
  depot: string
  debut: Date
  fin: Date
  close: boolean
  modifications: number
  reponses: number
}

const sessions = computed<Session[]>(() => {
  const parSession = new Map<string, Session>()
  for (const e of evenements.value) {
    if (e.source !== 'claude-code' || !e.session) continue
    const quand = new Date(e.recuLe)
    const s = parSession.get(e.session) ?? {
      cle: e.session,
      depot: e.depot ?? 'cairn-wms',
      debut: quand,
      fin: quand,
      close: false,
      modifications: 0,
      reponses: 0,
    }
    if (quand < s.debut) s.debut = quand
    if (quand > s.fin) s.fin = quand
    if (e.type === 'SessionEnd') s.close = true
    if (e.type === 'PostToolUse') s.modifications += 1
    if (e.type === 'Stop') s.reponses += 1
    parSession.set(e.session, s)
  }
  return [...parSession.values()]
})

function pluriel(n: number, un: string, plusieurs: string): string {
  return `${n} ${n === 1 ? un : plusieurs}`
}

const jours = computed<JourSemaine[]>(() => {
  const maintenant = new Date()
  const aujourdhui = jourDe(maintenant)
  const semaine = joursDeLaSemaine(maintenant, true)

  const blocsParJour = new Map<string, Array<BlocSemaine & { quand: Date }>>()
  const poser = (jour: string, bloc: BlocSemaine & { quand: Date }) => {
    const liste = blocsParJour.get(jour) ?? []
    liste.push(bloc)
    blocsParJour.set(jour, liste)
  }

  for (const entree of entrees.value) {
    const d = lireDateJournal(entree.date)
    if (!d) continue
    poser(jourDe(d), {
      cle: `j-${entree.fichier}`,
      quand: d,
      etat: 'ok',
      libelle: 'Journal',
      titre: sujetDe(entree),
      detail: entree.objectif ?? undefined,
      reperes: [heureDe(d), ...(entree.modules.length ? [`modules ${entree.modules.join(', ')}`] : [])],
      to: '/journal',
    })
  }

  for (const s of sessions.value) {
    const enCours = !s.close && maintenant.getTime() - s.fin.getTime() < SILENCE_MAX_MS
    poser(jourDe(s.debut), {
      cle: `s-${s.cle}`,
      quand: s.debut,
      etat: enCours ? 'accent' : 'info',
      libelle: enCours ? 'En cours' : 'Session',
      titre: s.depot,
      detail: `${pluriel(s.modifications, 'fichier modifié', 'fichiers modifiés')} · ${pluriel(s.reponses, 'réponse', 'réponses')}`,
      reperes: [`${heureDe(s.debut)} → ${s.close || !enCours ? heureDe(s.fin) : '…'}`, duree(s.debut, s.fin)],
      enCours,
    })
  }

  // Le design montre du lundi au vendredi ; le week-end n'apparaît que s'il
  // s'y est passé quelque chose.
  const weekend = semaine.slice(5).some(j => (blocsParJour.get(jourDe(j))?.length ?? 0) > 0)
  const retenus = portee.value === 'jour'
    ? [maintenant]
    : (weekend ? semaine : semaine.slice(0, 5))

  return retenus.map((j) => {
    const cle = jourDe(j)
    return {
      cle,
      nom: jourCourt(j),
      numero: String(j.getDate()),
      courant: cle === aujourdhui,
      blocs: (blocsParJour.get(cle) ?? [])
        .sort((a, b) => a.quand.getTime() - b.quand.getTime())
        .map(({ quand: _q, ...bloc }) => bloc),
    }
  })
})
</script>

<template>
  <ZonePrincipale>
    <section class="cartes">
      <BaseCard
        centre
        :titre="avancement?.projet ?? 'Cairn WMS'"
        :sous-titre="compte ? `${compte.total} modules · ${avancement?.couches?.length ?? 0} couches` : 'suivi indisponible'"
        class="carte"
      >
        <NuxtLink to="/avancement" class="disque" title="Le détail, couche par couche">
          <span class="part">{{ progression === null ? '—' : `${progression} %` }}</span>
        </NuxtLink>

        <div v-if="compte" class="etats">
          <BaseTuile
            v-for="etat in ORDRE"
            :key="etat"
            compacte
            :libelle="etat"
            :valeur="String(compte.parEtat[etat] ?? 0)"
          />
        </div>
        <EtatEchec
          v-else
          titre="Suivi illisible"
          detail="L'avancement de cairn-wms n'a pas pu être lu. Le détail dit pourquoi."
        />
      </BaseCard>

      <BaseCard titre="Tickets" :compte="ouverts.length" class="carte">
        <template #lien>
          <LienChevron :href="`https://github.com/${tickets?.depot ?? 'LucasLH1/cairn-wms'}/issues`">GitHub</LienChevron>
        </template>

        <template v-if="derniersTickets.length">
          <LigneListe
            v-for="t in derniersTickets"
            :key="t.numero"
            :href="t.url"
            :titre="t.titre"
            :sous="sousTicket(t)"
            :courant="t.types.includes('bug')"
          />
        </template>
        <EtatEchec
          v-else-if="tickets?.echec"
          titre="Tickets illisibles"
          detail="Les tickets de cairn-wms n'ont pas pu être lus."
        />
        <EtatVide v-else message="Aucun ticket ouvert." />
      </BaseCard>

      <BaseCard titre="Journal" :compte="journal?.total ?? 0" class="carte">
        <template #lien>
          <LienChevron to="/journal">Tout voir</LienChevron>
        </template>

        <div v-if="dernieresEntrees.length" class="entrees">
          <BaseTuile
            v-for="(entree, i) in dernieresEntrees"
            :key="entree.fichier"
            to="/journal"
            :teinte="i === 0 ? 'accent' : 'neutre'"
            :libelle="quandEntree(entree)"
            :valeur="sujetDe(entree)"
            :detail="entree.objectif ?? undefined"
            class="entree"
          />
        </div>
        <EtatEchec
          v-else-if="journal?.echec"
          titre="Journal illisible"
          detail="Le journal de cairn-wms n'a pas pu être lu."
        />
        <EtatVide v-else message="Aucune entrée de journal." />
      </BaseCard>
    </section>

    <section class="semaine-tete">
      <h2 class="section">{{ portee === 'jour' ? 'Aujourd\'hui' : 'Semaine' }}</h2>
      <ControleSegmente v-model="portee" :options="PORTEES" nom="Portée" />
    </section>

    <ClientOnly>
      <SemaineGrille :jours="jours" />
      <template #fallback>
        <div class="attente" />
      </template>
    </ClientOnly>
  </ZonePrincipale>
</template>

<style scoped>
.cartes {
  display: grid;
  flex: none;
  grid-template-columns: repeat(auto-fit, minmax(252px, 1fr));
  gap: var(--sp-grille);
}

.carte {
  min-height: 234px;
}

/* Le disque d'accent du design, avec son dégradé et son halo : ici, la part
   des modules qui ont dépassé « à faire », et le chemin vers le détail. */
.disque {
  display: grid;
  flex: none;
  place-items: center;
  width: 70px;
  height: 70px;
  margin: 11px 0 13px;
  border-radius: 50%;
  background: var(--g-accent);
  box-shadow: var(--sh-accent);
  color: var(--c-sur-accent);
}

.disque:hover {
  filter: brightness(1.06);
  color: var(--c-sur-accent);
}

.disque:active {
  transform: scale(0.97);
}

.part {
  font-size: var(--fs-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
}

.etats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-4);
  width: 100%;
  margin-top: auto;
  text-align: left;
}

.entrees {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-auto-rows: minmax(78px, 1fr);
  gap: 8px;
}

.entree :deep(.detail) {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.semaine-tete {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-6);
  padding: 2px 2px 0;
}

.section {
  font-size: var(--fs-section);
  font-weight: 600;
  letter-spacing: -0.02em;
}

.attente {
  flex: 1;
  min-height: 340px;
  border-top: 1px solid var(--c-border);
}
</style>
