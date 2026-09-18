<script setup lang="ts">
// La vue « Documentation » du design : à gauche la navigation groupée, au
// centre l'article, à droite « Sur cette page ». La colonne latérale du fil
// reste celle de l'ossature.
//
// Rien n'est recopié ni conservé : l'arbre et le document sont relus à chaque
// affichage, pour qu'une modification poussée sur `dev` soit visible sans
// redéployer. Le HTML vient du serveur, produit par markdown-it dans sa
// configuration par défaut (fiche 0004) : le HTML brut du document n'est
// jamais émis, il est échappé. C'est ce qui rend cet affichage sûr.
import { MESSAGES } from '~~/server/utils/echec-doc'
import type { EchecDoc, Groupe } from '~~/server/utils/doc-github'

const props = defineProps<{
  /** Le document à lire, relatif à `docs/` — ou `null` pour l'aperçu du dossier. */
  chemin: string | null
}>()

// — L'arbre ————————————————————————————————————————————————————————————

const { data: arbre } = await useFetch<{
  depot?: string
  branche?: string
  groupes?: Groupe[]
  echec?: EchecDoc
}>('/api/doc/arbre', { key: 'doc-arbre', default: () => ({}) })

const groupes = computed(() => arbre.value?.groupes ?? [])

/** Sans document demandé, l'aperçu du dépôt : son `README.md`, s'il en a un. */
const cheminLu = computed(() => {
  if (props.chemin) return props.chemin
  const racine = groupes.value.find(g => g.dossier === null)
  return racine?.documents.find(d => d.chemin.toLowerCase() === 'readme.md')?.chemin ?? null
})

// — Le document ——————————————————————————————————————————————————————————

const { data: document } = await useFetch<{
  chemin?: string
  nom?: string
  branche?: string
  html?: string
  echec?: EchecDoc
}>('/api/doc/document', {
  key: () => `doc-${cheminLu.value ?? ''}`,
  query: { chemin: cheminLu },
  default: () => ({}),
  immediate: cheminLu.value !== null,
  watch: [cheminLu],
})

const echec = computed(() => arbre.value?.echec ?? document.value?.echec ?? null)

/**
 * Le document, découpé : son titre (le premier `h1`, que markdown-it a
 * produit à partir du `# …` du document) et le reste. Les sections reçoivent un
 * identifiant, pour que « Sur cette page » y mène.
 */
const decoupe = computed(() => {
  const html = document.value?.html ?? ''
  const titre = /^\s*<h1>(.*?)<\/h1>/s.exec(html)
  const corpsBrut = titre ? html.slice(titre[0].length) : html
  const sections: Array<{ id: string, titre: string }> = []
  const corps = corpsBrut.replace(/<h2>(.*?)<\/h2>/gs, (_, texte: string) => {
    const id = `section-${sections.length + 1}`
    sections.push({ id, titre: texte.replace(/<[^>]+>/g, '') })
    return `<h2 id="${id}">${texte}</h2>`
  })
  const mots = corpsBrut.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
  return {
    titre: titre?.[1]?.replace(/<[^>]+>/g, '') ?? document.value?.nom ?? '',
    corps,
    sections,
    lecture: Math.max(1, Math.round(mots / 200)),
  }
})

// — « Sur cette page » : la section en vue est marquée ———————————————————

const sectionEnVue = ref<string | null>(null)
const article = ref<HTMLElement | null>(null)
let observateur: IntersectionObserver | null = null

function observer() {
  observateur?.disconnect()
  if (!article.value || typeof IntersectionObserver === 'undefined') return
  observateur = new IntersectionObserver((entrees) => {
    const visible = entrees.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
    if (visible) sectionEnVue.value = visible.target.id
  }, { rootMargin: '-10% 0px -70% 0px' })
  for (const h2 of article.value.querySelectorAll('h2[id]')) observateur.observe(h2)
}

onMounted(observer)
watch(() => decoupe.value.corps, () => nextTick(observer))
onBeforeUnmount(() => observateur?.disconnect())

// — La navigation ————————————————————————————————————————————————————————

const recherche = ref('')
const champRecherche = ref<HTMLInputElement | null>(null)

const groupesVisibles = computed(() => {
  const terme = recherche.value.trim().toLowerCase()
  return groupes.value
    .map(g => ({
      ...g,
      documents: terme ? g.documents.filter(d => d.nom.toLowerCase().includes(terme)) : g.documents,
    }))
    .filter(g => g.documents.length > 0)
})

/** Le libellé d'un groupe : la racine est l'aperçu, un dossier porte son nom. */
function libelleGroupe(dossier: string | null): string {
  if (dossier === null) return 'Aperçu'
  const nom = dossier.replace(/-/g, ' ')
  return nom.charAt(0).toUpperCase() + nom.slice(1)
}

/**
 * Le nom d'un document, tel que le fichier le porte, rendu lisible : les
 * tirets deviennent des espaces, et un numéro en tête — celui d'un module
 * (`0.1-…`) ou d'une fiche (`0001-…`) — se détache du reste.
 */
function libelleDocument(nom: string): string {
  const numerote = /^(\d+(?:\.\d+)?)-(.+)$/.exec(nom)
  if (numerote) {
    const reste = (numerote[2] ?? '').replace(/-/g, ' ')
    return `${numerote[1]} — ${reste.charAt(0).toUpperCase()}${reste.slice(1)}`
  }
  return nom.replace(/-/g, ' ')
}

function raccourci(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    champRecherche.value?.focus()
  }
}

onMounted(() => window.addEventListener('keydown', raccourci))
onBeforeUnmount(() => window.removeEventListener('keydown', raccourci))

const lienGithub = computed(() => {
  const depot = arbre.value?.depot
  if (!depot || !cheminLu.value) return null
  return `https://github.com/${depot}/blob/${arbre.value?.branche ?? 'dev'}/docs/${cheminLu.value}`
})
</script>

<template>
  <div class="doc">
    <nav class="navigation" aria-label="Documents">
      <label class="recherche">
        <span class="loupe" aria-hidden="true" />
        <input
          ref="champRecherche"
          v-model="recherche"
          type="search"
          placeholder="Rechercher"
          aria-label="Rechercher un document"
        >
        <kbd>⌘K</kbd>
      </label>

      <div v-if="groupesVisibles.length" class="groupes">
        <template v-for="groupe in groupesVisibles" :key="groupe.dossier ?? 'racine'">
          <div class="groupe">{{ libelleGroupe(groupe.dossier) }}</div>
          <NuxtLink
            v-for="d in groupe.documents"
            :key="d.chemin"
            :to="`/documentation/${d.chemin}`"
            class="entree"
            :class="{ 'entree--courante': d.chemin === cheminLu }"
          >
            <span class="point" aria-hidden="true" />
            <span class="nom">{{ libelleDocument(d.nom) }}</span>
          </NuxtLink>
        </template>
      </div>
      <p v-else-if="recherche" class="aucun">Aucun document ne porte ce nom.</p>

      <div class="source">
        <span class="point-source" aria-hidden="true" />
        <span>Lu à la source · {{ arbre?.depot ?? 'cairn-wms' }}, branche {{ arbre?.branche ?? 'dev' }}</span>
      </div>
    </nav>

    <div class="centre">
      <article v-if="echec" class="article">
        <EtatEchec :titre="MESSAGES[echec].titre" :detail="MESSAGES[echec].detail" />
      </article>

      <article v-else-if="cheminLu === null" class="article">
        <EtatVide
          message="Choisissez un document dans la navigation."
          mention="Le dépôt n'a pas de README.md à montrer d'abord."
        />
      </article>

      <template v-else>
        <article ref="article" class="article">
          <header class="tete">
            <div class="chemin">docs / {{ cheminLu }}</div>
            <h2 class="titre">{{ decoupe.titre }}</h2>
            <div class="meta">
              <BaseEtiquette teinte="ok" ronde point>lu sur {{ document?.branche ?? 'dev' }}</BaseEtiquette>
              <span class="details">
                {{ decoupe.sections.length }} section{{ decoupe.sections.length > 1 ? 's' : '' }} ·
                {{ decoupe.lecture }} min de lecture
              </span>
            </div>
          </header>

          <div class="filet" />

          <!-- eslint-disable-next-line vue/no-v-html -- HTML produit par markdown-it,
               sans HTML brut du document : fiche 0004, éprouvé dans test/markdown.spec.ts -->
          <div class="prose" v-html="decoupe.corps" />
        </article>

        <aside class="sommaire" aria-label="Sur cette page">
          <div class="bloc">
            <div class="intitule">Sur cette page</div>
            <a
              v-for="(section, i) in decoupe.sections"
              :key="section.id"
              :href="`#${section.id}`"
              class="section"
              :class="{ 'section--en-vue': sectionEnVue ? sectionEnVue === section.id : i === 0 }"
            >{{ section.titre }}</a>
            <span v-if="decoupe.sections.length === 0" class="section section--aucune">Une seule section</span>
          </div>

          <div class="filet" />

          <BoutonSecondaire v-if="lienGithub" :href="lienGithub" class="github">Voir sur GitHub ↗</BoutonSecondaire>
        </aside>
      </template>
    </div>
  </div>
</template>

<style scoped>
.doc {
  display: flex;
  flex: 1 1 var(--w-principal);
  flex-wrap: wrap;
  align-items: stretch;
  min-width: 0;
}

/* — La navigation — */

.navigation {
  display: flex;
  flex: 0 1 var(--w-nav-doc);
  flex-direction: column;
  gap: var(--sp-5);
  min-width: 0;
  padding: 16px 14px;
  border-right: 1px solid var(--c-border);
}

.recherche {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: 11px 13px;
  border: 1px solid var(--c-border);
  border-radius: var(--r-tuile);
  background: var(--c-tile);
  color: var(--c-muted);
  font-size: var(--fs-base);
}

.recherche:focus-within {
  border-color: var(--c-accent-survol);
}

.loupe {
  flex: none;
  width: 13px;
  height: 13px;
  border: 1.5px solid currentcolor;
  border-radius: 50%;
}

.recherche input {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--c-text);
  font: inherit;
  outline: none;
}

.recherche input::placeholder {
  color: var(--c-muted);
}

kbd {
  margin-left: auto;
  padding: 2px 6px;
  border: 1px solid var(--c-border);
  border-radius: var(--r-touche);
  font-family: var(--font-sans);
  font-size: var(--fs-xs);
}

.groupes {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.groupe {
  padding: 14px 11px 4px;
  color: var(--c-dim);
  font-size: var(--fs-xs);
}

.groupe:first-child {
  padding-top: 8px;
}

.entree {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: 9px 11px;
  border: 1px solid transparent;
  border-radius: var(--r-tile);
  color: var(--c-muted);
  font-size: var(--fs-base);
}

.entree:hover {
  background: var(--c-tile);
  color: var(--c-text);
}

.entree--courante,
.entree--courante:hover {
  border-color: var(--c-accent-bord);
  background: var(--c-accent-fond);
  color: var(--c-text);
  font-weight: 500;
}

.point {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentcolor;
}

.entree--courante .point {
  background: var(--c-accent);
}

.nom {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aucun {
  padding: 8px 11px;
  color: var(--c-dim);
  font-size: var(--fs-md);
}

.source {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-top: auto;
  padding: 12px 13px;
  border: 1px solid var(--c-border);
  border-radius: var(--r-aside);
  background: var(--c-card);
  color: var(--c-muted);
  font-size: var(--fs-sous);
}

.point-source {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c-ok);
}

/* — L'article et sa table des matières — */

.centre {
  display: flex;
  flex: 999 1 460px;
  flex-wrap: wrap;
  align-items: stretch;
  min-width: 0;
}

.article {
  display: flex;
  flex: 999 1 420px;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding: 20px 22px 24px;
}

.tete {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.chemin {
  color: var(--c-dim);
  font-size: var(--fs-sous);
}

.titre {
  font-size: var(--fs-article);
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.15;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-4);
}

.details {
  color: var(--c-muted);
  font-size: var(--fs-sous);
}

.filet {
  height: 1px;
  background: var(--c-border);
}

.sommaire {
  display: flex;
  flex: 1 1 var(--w-toc-doc);
  flex-direction: column;
  gap: var(--sp-6);
  min-width: 0;
  padding: 18px 16px;
  border-left: 1px solid var(--c-border);
}

.bloc {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.intitule {
  color: var(--c-dim);
  font-size: var(--fs-sm);
}

.section {
  padding-left: 11px;
  border-left: 2px solid var(--c-border);
  color: var(--c-muted);
  font-size: var(--fs-base);
}

.section:hover {
  color: var(--c-text);
}

.section--en-vue {
  border-left-color: var(--c-accent);
  color: var(--c-text);
  font-weight: 500;
}

.section--aucune {
  color: var(--c-dim);
}

.github {
  padding: 12px;
  border-radius: var(--r-aside);
  font-size: var(--fs-base);
}

/* — Le document rendu : les tailles et les couleurs de l'article du design — */

.prose {
  color: var(--c-text);
  font-size: var(--fs-lg);
  line-height: 1.7;
}

.prose :deep(> *) {
  max-width: 68ch;
}

.prose :deep(h2),
.prose :deep(h3),
.prose :deep(h4) {
  margin: 22px 0 0;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.prose :deep(h2) {
  font-size: var(--fs-tuile);
}

.prose :deep(h3) {
  font-size: var(--fs-lg);
}

.prose :deep(h4) {
  font-size: var(--fs-base);
}

.prose :deep(h2:first-child),
.prose :deep(h3:first-child) {
  margin-top: 0;
}

.prose :deep(p),
.prose :deep(ul),
.prose :deep(ol) {
  margin: var(--sp-3) 0 0;
}

.prose :deep(ul),
.prose :deep(ol) {
  padding-left: 22px;
}

.prose :deep(li) {
  margin-bottom: var(--sp-1);
}

.prose :deep(li > ul),
.prose :deep(li > ol) {
  margin-top: var(--sp-1);
}

.prose :deep(strong) {
  font-weight: 600;
}

.prose :deep(a) {
  color: var(--c-info);
}

.prose :deep(a:hover) {
  color: var(--c-info-soft);
}

.prose :deep(code) {
  padding: 1px 5px;
  border-radius: var(--r-touche);
  background: var(--c-tile);
  font-family: var(--font-mono);
  font-size: var(--fs-sous);
}

/* Le bloc de code du design : tuile à coins de 13 px, mono de 12 px, aéré. */
.prose :deep(pre) {
  overflow-x: auto;
  margin: var(--sp-5) 0 0;
  padding: 15px 17px;
  border: 1px solid var(--c-border);
  border-radius: var(--r-bloc);
  background: var(--c-tile);
  font-family: var(--font-mono);
  font-size: var(--fs-sous);
  line-height: 1.8;
}

.prose :deep(pre code) {
  padding: 0;
  background: transparent;
}

/* L'encart du design, en avertissement : une citation en est le pendant. */
.prose :deep(blockquote) {
  margin: var(--sp-5) 0 0;
  padding: 15px 17px;
  border: 1px solid var(--c-warn-bord);
  border-radius: var(--r-bloc);
  background: var(--c-warn-encart);
  color: var(--c-text);
  font-size: var(--fs-base);
  line-height: 1.6;
}

.prose :deep(blockquote > p) {
  margin: 0;
}

.prose :deep(table) {
  display: block;
  overflow-x: auto;
  width: 100%;
  max-width: none;
  margin: var(--sp-5) 0 0;
  border-collapse: collapse;
  font-size: var(--fs-base);
  line-height: 1.5;
}

.prose :deep(th),
.prose :deep(td) {
  padding: var(--sp-3) 11px;
  border: 1px solid var(--c-border);
  text-align: left;
  vertical-align: top;
}

.prose :deep(th) {
  background: var(--c-tile);
  font-weight: 600;
}

.prose :deep(td) {
  color: var(--c-muted);
}

.prose :deep(hr) {
  height: 1px;
  margin: 22px 0 0;
  border: 0;
  background: var(--c-border);
}
</style>
