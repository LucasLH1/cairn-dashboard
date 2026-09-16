<script setup lang="ts">
// Sélecteur sombre / clair du design : deux pastilles dans une pilule, sans
// libellé écrit. Le choix reste sur le poste du visiteur : rien n'est envoyé au
// serveur, aucune donnée n'est conservée ailleurs.
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
      title="Sombre"
      @click="appliquer('dark')"
    >
      <span aria-hidden="true">☾</span>
      <span class="lecture">Sombre</span>
    </button>
    <button
      type="button"
      class="choix"
      :class="{ 'choix--actif': theme === 'light' }"
      :aria-pressed="theme === 'light'"
      title="Clair"
      @click="appliquer('light')"
    >
      <span aria-hidden="true">☀</span>
      <span class="lecture">Clair</span>
    </button>
  </div>
</template>

<style scoped>
.bascule {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: var(--r-pill);
  background: var(--c-tile);
}

.choix {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--c-muted);
  font-size: var(--fs-base);
}

.choix--actif {
  background: var(--c-bascule);
  box-shadow: var(--sh-bascule);
  color: var(--c-text);
}

.lecture {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
