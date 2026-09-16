<script setup lang="ts">
// Rail de navigation du design : des icônes seules, jamais de libellé écrit —
// le libellé vit dans l'infobulle, et dans un texte réservé aux lecteurs
// d'écran. Une entrée dont la tranche n'est pas livrée reste inerte.
const route = useRoute()

const sections = [
  { id: 'accueil', libelle: 'Vue d\'ensemble', icone: 'vue-ensemble', chemin: '/', tranche: null },
  { id: 'documentation', libelle: 'Documentation', icone: 'documentation', chemin: '/documentation', tranche: null },
  { id: 'avancement', libelle: 'Avancement', icone: 'avancement', chemin: null, tranche: '3' },
  { id: 'tickets', libelle: 'Tickets', icone: 'tickets', chemin: null, tranche: '4' },
  { id: 'journal', libelle: 'Journal', icone: 'journal', chemin: null, tranche: '5' },
  { id: 'deploiements', libelle: 'Déploiements', icone: 'deploiements', chemin: null, tranche: '8' },
]

function estActive(chemin: string | null): boolean {
  if (!chemin) return false
  if (chemin === '/') return route.path === '/'
  return route.path === chemin || route.path.startsWith(`${chemin}/`)
}
</script>

<template>
  <nav class="rail" aria-label="Sections">
    <AppMarque class="marque" />

    <ul class="entrees">
      <li v-for="section in sections" :key="section.id">
        <NuxtLink
          v-if="section.chemin"
          :to="section.chemin"
          class="entree"
          :class="{ 'entree--active': estActive(section.chemin) }"
          :title="section.libelle"
        >
          <AppIcone :nom="section.icone" />
          <span class="lecture">{{ section.libelle }}</span>
        </NuxtLink>

        <span
          v-else
          class="entree"
          aria-disabled="true"
          :title="`${section.libelle} — tranche ${section.tranche}, à venir`"
        >
          <AppIcone :nom="section.icone" />
          <span class="lecture">{{ section.libelle }}</span>
        </span>
      </li>
    </ul>

    <div class="bas">
      <form method="post" action="/auth/deconnexion">
        <button type="submit" class="entree entree--sortie" title="Se déconnecter">
          <AppIcone nom="quitter" />
          <span class="lecture">Se déconnecter</span>
        </button>
      </form>
    </div>
  </nav>
</template>

<style scoped>
.rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 22px 0 26px;
  background: var(--c-rail);
  border-right: 1px solid var(--c-border);
}

.marque {
  margin-bottom: 20px;
}

.entrees {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.entree {
  display: grid;
  place-items: center;
  width: var(--w-entree);
  height: var(--w-entree);
  padding: 0;
  border: 0;
  border-radius: var(--r-rail);
  background: transparent;
  color: var(--c-muted);
}

.entree--active {
  background: var(--c-tile);
  color: var(--c-text);
}

.entree:not([aria-disabled='true']):hover {
  background: var(--c-tile);
  color: var(--c-text);
}

.entree--sortie {
  color: var(--c-alert);
}

.entree--sortie:hover {
  background: var(--c-alert-fond);
  color: var(--c-alert);
}

/* Le design ne montre que des icônes : le libellé reste lisible par un lecteur
   d'écran, sans rien afficher. */
.lecture {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.bas {
  margin-top: auto;
}
</style>
