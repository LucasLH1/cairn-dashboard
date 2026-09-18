<script setup lang="ts">
// Ossature du design : un cadre applicatif arrondi, posé sur le fond de page,
// qui tient le rail et la colonne de contenu. Sous l'en-tête, le contenu se
// partage entre la zone principale de l'écran et la colonne latérale — celle-ci
// est présente sur toutes les vues du design, elle fait donc partie de
// l'ossature, pas d'un écran.
</script>

<template>
  <div class="page">
    <div class="cadre">
      <AppRail />

      <div class="colonne">
        <AppHeader />
        <main class="contenu">
          <slot />
          <AppLateral />
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  justify-content: center;
  min-height: 100%;
  padding: var(--sp-frame);
  background: var(--g-page);
}

.cadre {
  display: grid;
  grid-template-columns: var(--w-rail) minmax(0, 1fr);
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--c-border);
  border-radius: var(--r-frame);
  background: var(--c-window);
  box-shadow: var(--sh-frame);
}

.colonne {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* Les colonnes se replient l'une sous l'autre en étroit, par leur base de
   flex : c'est le mécanisme du design, qui n'a aucune règle d'adaptation. */
.contenu {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: stretch;
  min-width: 0;
}
</style>
