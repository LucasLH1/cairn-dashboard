<script setup lang="ts">
// Ossature commune des écrans : rail de navigation, en-tête, zone de contenu.
// Les entrées du rail sont inertes tant que leur tranche n'est pas livrée.
const sections = [
  { id: 'accueil', libelle: 'Vue d\'ensemble', glyphe: '◇', tranche: null },
  { id: 'documentation', libelle: 'Documentation', glyphe: '▤', tranche: '2' },
  { id: 'avancement', libelle: 'Avancement', glyphe: '▦', tranche: '3' },
  { id: 'tickets', libelle: 'Tickets', glyphe: '◎', tranche: '4' },
  { id: 'journal', libelle: 'Journal', glyphe: '≡', tranche: '5' },
  { id: 'deploiements', libelle: 'Déploiements', glyphe: '▲', tranche: '8' },
]
</script>

<template>
  <div class="coque">
    <nav class="rail" aria-label="Sections">
      <span class="marque" aria-hidden="true">◈</span>
      <ul>
        <li v-for="section in sections" :key="section.id">
          <span
            class="entree"
            :class="{ 'entree--active': section.tranche === null }"
            :aria-disabled="section.tranche !== null"
            :title="section.tranche === null ? section.libelle : `${section.libelle} — tranche ${section.tranche}, à venir`"
          >
            <span class="glyphe" aria-hidden="true">{{ section.glyphe }}</span>
            <span class="libelle">{{ section.libelle }}</span>
          </span>
        </li>
      </ul>
    </nav>

    <div class="colonne">
      <AppHeader />
      <main class="contenu">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.coque {
  display: grid;
  grid-template-columns: var(--w-rail) minmax(0, 1fr);
  min-height: 100%;
  background: var(--c-window);
}

.rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-6);
  padding: var(--sp-5) var(--sp-2);
  background: var(--c-rail);
  border-right: 1px solid var(--c-border);
}

.marque {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: var(--r-tile);
  background: var(--c-accent);
  color: #ffffff;
  font-size: var(--fs-lg);
}

.rail ul {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.entree {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 52px;
  padding: var(--sp-2) 0;
  border-radius: var(--r-tile);
  color: var(--c-dim);
  text-align: center;
}

.entree--active {
  background: var(--c-tile);
  color: var(--c-text);
}

.glyphe {
  font-size: var(--fs-lg);
  line-height: 1;
}

.libelle {
  font-size: 9px;
  letter-spacing: 0.02em;
}

.colonne {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.contenu {
  padding: var(--sp-6);
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}

@media (max-width: 640px) {
  .coque {
    grid-template-columns: minmax(0, 1fr);
  }

  .rail {
    flex-direction: row;
    justify-content: flex-start;
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid var(--c-border);
  }

  .rail ul {
    flex-direction: row;
  }

  .contenu {
    padding: var(--sp-5) var(--sp-4);
  }
}
</style>
