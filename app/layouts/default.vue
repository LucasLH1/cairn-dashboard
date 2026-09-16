<script setup lang="ts">
// Ossature du design : un cadre applicatif arrondi, posé sur le fond de page,
// qui tient le rail et la colonne de contenu.
</script>

<template>
  <div class="page">
    <div class="cadre">
      <AppRail />

      <div class="colonne">
        <AppHeader />
        <main class="contenu">
          <slot />
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

.contenu {
  display: flex;
  flex-direction: column;
  gap: var(--sp-grille);
  min-width: 0;
  padding: var(--sp-contenu);
}
</style>
