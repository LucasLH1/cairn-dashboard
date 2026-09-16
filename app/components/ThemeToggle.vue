<script setup lang="ts">
// Sélecteur sombre / clair du design. Le choix reste sur le poste du visiteur :
// rien n'est envoyé au serveur, aucune donnée n'est conservée ailleurs.
type Theme = 'dark' | 'light'

const theme = ref<Theme | null>(null)

function appliquer(valeur: Theme) {
  theme.value = valeur
  document.documentElement.dataset.theme = valeur
  try {
    localStorage.setItem('cairn-theme', valeur)
  }
  catch {
    // Stockage refusé (navigation privée) : le choix vaut pour la visite.
  }
}

onMounted(() => {
  let enregistre: string | null = null
  try {
    enregistre = localStorage.getItem('cairn-theme')
  }
  catch {
    enregistre = null
  }

  if (enregistre === 'dark' || enregistre === 'light') {
    appliquer(enregistre)
    return
  }

  theme.value = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
})
</script>

<template>
  <div class="bascule" role="group" aria-label="Thème">
    <button
      type="button"
      class="choix"
      :class="{ 'choix--actif': theme === 'dark' }"
      :aria-pressed="theme === 'dark'"
      @click="appliquer('dark')"
    >
      <span aria-hidden="true">☾</span>
      <span class="texte">Sombre</span>
    </button>
    <button
      type="button"
      class="choix"
      :class="{ 'choix--actif': theme === 'light' }"
      :aria-pressed="theme === 'light'"
      @click="appliquer('light')"
    >
      <span aria-hidden="true">☀</span>
      <span class="texte">Clair</span>
    </button>
  </div>
</template>

<style scoped>
.bascule {
  display: flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--c-border);
  border-radius: var(--r-pill);
  background: var(--c-tile);
}

.choix {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  padding: 3px var(--sp-3);
  border: 0;
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--c-muted);
  font-size: var(--fs-sm);
}

.choix--actif {
  background: var(--c-card);
  color: var(--c-text);
}

@media (max-width: 640px) {
  .texte {
    display: none;
  }
}
</style>
