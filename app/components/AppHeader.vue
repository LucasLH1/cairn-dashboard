<template>
  <header class="entete">
    <div class="titres">
      <h1>Cairn Dashboard</h1>
      <p class="sous-titre">Suivi du projet Cairn WMS</p>
    </div>
    <ThemeToggle />
  </header>
</template>

<style scoped>
.entete {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  height: var(--h-header);
  padding: 0 var(--sp-6);
  background: var(--c-side);
  border-bottom: 1px solid var(--c-border);
}

.titres {
  display: flex;
  align-items: baseline;
  gap: var(--sp-4);
  min-width: 0;
}

.sous-titre {
  color: var(--c-muted);
  font-size: var(--fs-sm);
}

@media (max-width: 640px) {
  .entete {
    padding: 0 var(--sp-4);
  }

  .sous-titre {
    display: none;
  }
}
</style>
