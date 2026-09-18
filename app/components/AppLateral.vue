<script setup lang="ts">
// La colonne latérale du design, présente sur toutes ses vues, sur le fond le
// plus profond de sa palette. Elle porte le fil d'activité en direct — la
// seule donnée propre du dashboard — sous les trois formes que le design
// donne à sa colonne : le nombre et ses barres, l'anneau de répartition, et
// les tuiles des derniers événements.
//
// Tout ce qui dépend de l'heure du poste se rend après le montage : le
// serveur vit dans un autre fuseau, et ne doit pas en décider.
import { depuis, jourCourt, jourDe, joursDeLaSemaine } from '~/utils/temps'
import type { EvenementFil } from '~/composables/useFil'

const { fil, evenements, recevoir } = useFil()
const etat = useEtatFil()
useFilDirect(recevoir)

const maintenant = ref(new Date())
let horloge: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  maintenant.value = new Date()
  horloge = setInterval(() => {
    maintenant.value = new Date()
  }, 60_000)
})
onBeforeUnmount(() => {
  if (horloge !== null) clearInterval(horloge)
})

const SEPT_JOURS_MS = 7 * 24 * 3600 * 1000

const recents = computed(() => evenements.value.filter(
  e => maintenant.value.getTime() - Date.parse(e.recuLe) < SEPT_JOURS_MS,
))

const etiquetteEtat = computed(() => {
  if (etat.value === 'ouvert') return { teinte: 'ok' as const, texte: 'en direct' }
  if (etat.value === 'connexion') return { teinte: 'warn' as const, texte: 'connexion…' }
  return { teinte: 'alerte' as const, texte: 'hors ligne' }
})

// — Les barres : un jour par colonne, la semaine en cours ————————————————

const barres = computed(() => {
  const parJour = new Map<string, number>()
  for (const e of recents.value) {
    const jour = jourDe(new Date(e.recuLe))
    parJour.set(jour, (parJour.get(jour) ?? 0) + 1)
  }
  const aujourdhui = jourDe(maintenant.value)
  // Le design montre du lundi au vendredi ; le week-end n'apparaît que s'il
  // s'y est passé quelque chose.
  const semaine = joursDeLaSemaine(maintenant.value, true)
  const weekend = semaine.slice(5).some(j => (parJour.get(jourDe(j)) ?? 0) > 0)
  const jours = weekend ? semaine : semaine.slice(0, 5)
  const maximum = Math.max(1, ...jours.map(j => parJour.get(jourDe(j)) ?? 0))
  return jours.map((j) => {
    const cle = jourDe(j)
    const compte = parJour.get(cle) ?? 0
    const nom = jourCourt(j)
    return {
      cle,
      libelle: nom.charAt(0) + nom.slice(1).toLowerCase(),
      valeur: String(compte),
      part: compte / maximum,
      courant: cle === aujourdhui,
    }
  })
})

// — L'anneau : d'où viennent les événements ————————————————————————————

const SOURCES = [
  { cle: 'push', libelle: 'Push', couleur: 'var(--c-info)', types: ['push'] },
  { cle: 'issues', libelle: 'Tickets', couleur: 'var(--c-accent)', types: ['issues'] },
  { cle: 'pull_request', libelle: 'Pull requests', couleur: 'var(--c-ok)', types: ['pull_request'] },
  { cle: 'workflow_run', libelle: 'Workflows', couleur: 'var(--c-warn)', types: ['workflow_run'] },
  { cle: 'session', libelle: 'Sessions', couleur: 'var(--c-dim)', types: ['SessionStart', 'SessionEnd', 'Stop', 'PostToolUse'] },
]

const parts = computed(() => SOURCES.map(s => ({
  cle: s.cle,
  libelle: s.libelle,
  couleur: s.couleur,
  valeur: recents.value.filter(e => s.types.includes(e.type)).length,
})).filter(p => p.valeur > 0))

// — Les tuiles : les derniers événements, une session regroupée ————————

const LIBELLES: Record<string, string> = {
  push: 'Push',
  issues: 'Ticket',
  pull_request: 'Pull request',
  workflow_run: 'Workflow',
  SessionStart: 'Session ouverte',
  SessionEnd: 'Session close',
  Stop: 'Réponse',
  PostToolUse: 'Fichier modifié',
}

const COMBIEN = 6
const LIGNES_PAR_SESSION = 4

interface Groupe {
  cle: string
  sorte: 'github' | 'session'
  session: string | null
  evenements: EvenementFil[]
}

// Les événements d'une même session se regroupent (fiche 0009) — les
// événements **consécutifs** : le fil reste un fil, dans l'ordre du temps.
const groupes = computed<Groupe[]>(() => {
  const sortie: Groupe[] = []
  for (const e of evenements.value) {
    const session = e.source === 'claude-code' && e.session ? e.session : null
    const dernier = sortie[sortie.length - 1]
    if (session !== null && dernier?.sorte === 'session' && dernier.session === session) {
      dernier.evenements.push(e)
      continue
    }
    if (sortie.length === COMBIEN) break
    sortie.push({
      cle: `${session === null ? 'g' : 's'}-${e.livraison}`,
      sorte: session === null ? 'github' : 'session',
      session,
      evenements: [e],
    })
  }
  return sortie
})

function libelleDe(groupe: Groupe): string {
  const premier = groupe.evenements[0]
  if (!premier) return ''
  const nom = groupe.sorte === 'session' ? 'Session' : (LIBELLES[premier.type] ?? premier.type)
  return premier.depot ? `${nom} · ${premier.depot}` : nom
}

function quand(groupe: Groupe): string {
  const premier = groupe.evenements[0]
  return premier ? depuis(new Date(premier.recuLe), maintenant.value) : ''
}
</script>

<template>
  <aside class="lateral" aria-label="Activité en direct">
    <ClientOnly>
      <section class="bloc">
        <header class="tete">
          <div class="gauche">
            <h2 class="titre">Activité</h2>
            <BaseEtiquette :teinte="etiquetteEtat.teinte">{{ etiquetteEtat.texte }}</BaseEtiquette>
          </div>
        </header>
        <GrosChiffre :valeur="recents.length" unite=" sur 7 j" />
        <BarresActivite :barres="barres" />
      </section>

      <section class="bloc">
        <header class="tete">
          <div class="gauche">
            <h2 class="titre">Sources</h2>
            <BaseEtiquette>7 jours</BaseEtiquette>
          </div>
        </header>
        <AnneauParts
          :parts="parts"
          :centre-valeur="recents.length"
          :centre-libelle="recents.length === 1 ? 'événement' : 'événements'"
        />
      </section>

      <section class="bloc bloc--fil">
        <header class="tete">
          <h2 class="titre">Fil en direct</h2>
          <BaseEtiquette v-if="fil?.total">{{ fil.total }}</BaseEtiquette>
        </header>

        <EtatEchec
          v-if="fil?.echec"
          titre="Historique indisponible"
          detail="Le dashboard n'a pas pu lire son historique. Les événements reçus pendant ce temps ne sont pas perdus : ils sont écrits avant d'être affichés."
        />

        <template v-else-if="groupes.length">
          <BaseTuile
            v-for="g in groupes"
            :key="g.cle"
            :libelle="libelleDe(g)"
            :valeur="g.sorte === 'session' ? 'Session de travail' : (g.evenements[0]?.titre ?? g.evenements[0]?.type)"
          >
            <template #coin>
              <span class="quand">
                {{ quand(g) }}
                <span
                  class="point"
                  :class="[`point--${g.evenements[0]?.type}`, { 'point--creux': g.sorte === 'session' }]"
                  aria-hidden="true"
                />
              </span>
            </template>

            <template v-if="g.sorte === 'session'">
              <span v-for="e in g.evenements.slice(0, LIGNES_PAR_SESSION)" :key="e.livraison" class="ligne">
                {{ e.titre ?? LIBELLES[e.type] ?? e.type }}
              </span>
              <span v-if="g.evenements.length > LIGNES_PAR_SESSION" class="ligne ligne--reste">
                et {{ g.evenements.length - LIGNES_PAR_SESSION }} de plus
              </span>
            </template>
            <template v-else>
              {{ LIBELLES[g.evenements[0]?.type ?? ''] ?? g.evenements[0]?.type }}<span v-if="g.evenements[0]?.auteur"> · {{ g.evenements[0]?.auteur }}</span>
            </template>
          </BaseTuile>
        </template>

        <EtatVide
          v-else
          message="Aucun événement reçu pour l'instant."
          mention="Le fil se remplira au premier push, ticket ou session sur cairn-wms."
        />

        <BoutonPrimaire to="/journal" class="ouvrir">Ouvrir le journal</BoutonPrimaire>
      </section>

      <template #fallback>
        <section class="bloc">
          <header class="tete">
            <h2 class="titre">Activité</h2>
          </header>
          <p class="attente">Le fil se charge…</p>
        </section>
      </template>
    </ClientOnly>
  </aside>
</template>

<style scoped>
/* Le design lui donne une base fixe de 292 px. Lucas la trouvait trop étroite,
   même élargie : elle suit désormais la fenêtre — 30 % de la zone de contenu,
   jamais moins de 324 px ni plus de 600 px — et reste la même sur tous les
   écrans (journal du 2026-09-18). Large, ses blocs se rangent côte à côte, le
   fil prenant toute la largeur. */
.lateral {
  display: grid;
  flex: 0 0 clamp(var(--w-lateral), 30%, var(--w-lateral-max));
  grid-template-columns: repeat(auto-fit, minmax(var(--w-lateral-bloc), 1fr));
  align-content: start;
  gap: var(--sp-6);
  min-width: 0;
  padding: 16px 18px;
  border-left: 1px solid var(--c-border);
  background: var(--c-side);
}

.bloc {
  display: flex;
  flex-direction: column;
  gap: 11px;
  min-width: 0;
}

.bloc--fil {
  grid-column: 1 / -1;
}

.tete {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
}

.gauche {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  min-width: 0;
}

.titre {
  font-size: var(--fs-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.attente {
  color: var(--c-dim);
  font-size: var(--fs-md);
}

/* Le coin de la tuile : quand, et le point de la source */
.quand {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--sp-2);
  color: var(--c-muted);
  font-size: var(--fs-sm);
  white-space: nowrap;
}

.point {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c-dim);
}

.point--push {
  background: var(--c-info);
}

.point--issues {
  background: var(--c-accent);
}

.point--pull_request {
  background: var(--c-ok);
}

.point--workflow_run {
  background: var(--c-warn);
}

/* Les deux sources se distinguent par la forme : pleine pour GitHub, creuse
   pour une session de travail. */
.point--creux {
  border: 1.5px solid var(--c-muted);
  background: transparent;
}

.ligne {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ligne--reste {
  color: var(--c-dim);
}

.ouvrir {
  margin-top: 2px;
}
</style>
