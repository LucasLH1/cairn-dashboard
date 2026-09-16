<script setup lang="ts">
// Rail de navigation du design : des icônes seules, jamais de libellé écrit —
// le libellé vit dans l'infobulle, et dans un texte réservé aux lecteurs
// d'écran. Les entrées dont la tranche n'est pas livrée restent inertes.
const sections = [
  { id: 'accueil', libelle: 'Vue d\'ensemble', icone: 'vue-ensemble', tranche: null },
  { id: 'documentation', libelle: 'Documentation', icone: 'documentation', tranche: '2' },
  { id: 'avancement', libelle: 'Avancement', icone: 'avancement', tranche: '3' },
  { id: 'tickets', libelle: 'Tickets', icone: 'tickets', tranche: '4' },
  { id: 'journal', libelle: 'Journal', icone: 'journal', tranche: '5' },
  { id: 'deploiements', libelle: 'Déploiements', icone: 'deploiements', tranche: '8' },
]
</script>

<template>
  <nav class="rail" aria-label="Sections">
    <AppMarque class="marque" />

    <ul class="entrees">
      <li v-for="section in sections" :key="section.id">
        <span
          class="entree"
          :class="{ 'entree--active': section.tranche === null }"
          :aria-disabled="section.tranche !== null"
          :title="section.tranche === null ? section.libelle : `${section.libelle} — tranche ${section.tranche}, à venir`"
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
}

.entree--sortie {
  color: var(--c-alert);
}

.entree--sortie:hover {
  background: var(--c-alert-fond);
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
