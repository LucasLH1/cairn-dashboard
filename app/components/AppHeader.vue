<script setup lang="ts">
// Le login n'est affiché que pour dire qui est connecté : le contrôle d'accès,
// lui, porte sur l'identifiant numérique du compte.
const { data: moi } = await useFetch<{ login: string | null }>('/api/moi', {
  default: () => ({ login: null }),
})
</script>

<template>
  <header class="entete">
    <div class="titres">
      <h1>Cairn Dashboard</h1>
      <p class="sous-titre">Suivi du projet Cairn WMS</p>
    </div>

    <div class="actions">
      <span v-if="moi?.login" class="compte">{{ moi.login }}</span>
      <ThemeToggle />
      <form method="post" action="/auth/deconnexion">
        <button type="submit" class="deconnexion">Se déconnecter</button>
      </form>
    </div>
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

.actions {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.compte {
  padding: 3px var(--sp-3);
  border-radius: var(--r-pill);
  background: var(--c-tile);
  color: var(--c-muted);
  font-size: var(--fs-sm);
}

.deconnexion {
  padding: 3px var(--sp-3);
  border: 1px solid var(--c-border);
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--c-muted);
  font-size: var(--fs-sm);
}

.deconnexion:hover {
  color: var(--c-text);
}

@media (max-width: 640px) {
  .entete {
    padding: 0 var(--sp-4);
  }

  .sous-titre,
  .compte {
    display: none;
  }
}
</style>
