<script setup lang="ts">
// En-tête du design : le titre de l'écran courant à gauche, les actions à
// droite. Le titre vient de la page elle-même, par sa méta « titre ».
const route = useRoute()
const titre = computed(() => String(route.meta.titre ?? 'Cairn Dashboard'))

// Le login n'est affiché que pour dire qui est connecté : le contrôle d'accès,
// lui, porte sur l'identifiant numérique du compte.
const { data: moi } = await useFetch<{ login: string | null }>('/api/moi', {
  default: () => ({ login: null }),
})

const initiales = computed(() => (moi.value?.login ?? '??').slice(0, 2).toUpperCase())
</script>

<template>
  <header class="entete">
    <h1>{{ titre }}</h1>

    <div class="actions">
      <ThemeToggle />
      <span class="compte" :title="moi?.login ?? 'Compte connecté'">{{ initiales }}</span>
    </div>
  </header>
</template>

<style scoped>
.entete {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-5);
  min-height: var(--h-header);
  padding: var(--sp-4) var(--sp-6);
  border-bottom: 1px solid var(--c-border);
}

h1 {
  font-size: var(--fs-title);
  line-height: 1.15;
}

.actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--sp-5);
}

.compte {
  display: grid;
  flex: none;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(145deg, var(--c-accent), var(--c-accent-soft));
  color: #161316;
  font-size: var(--fs-base);
  font-weight: 600;
}

@media (max-width: 640px) {
  .entete {
    padding: var(--sp-4);
  }
}
</style>
