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

// Le point de présence du design, sur l'avatar : ici, il dit si le fil en
// direct est ouvert — c'est le seul « en ligne » qui ait un sens.
const etat = useEtatFil()
const presence = computed(() => {
  if (etat.value === 'ouvert') return { classe: 'presence--ouvert', texte: 'fil en direct ouvert' }
  if (etat.value === 'connexion') return { classe: 'presence--connexion', texte: 'connexion au fil en direct' }
  return { classe: 'presence--ferme', texte: 'fil en direct fermé' }
})
</script>

<template>
  <header class="entete">
    <h1>{{ titre }}</h1>

    <div class="actions">
      <ThemeToggle />
      <span class="avatar" :title="`${moi?.login ?? 'Compte connecté'} — ${presence.texte}`">
        <span class="compte">{{ initiales }}</span>
        <span class="presence" :class="presence.classe" aria-hidden="true" />
      </span>
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
  padding: 0 var(--sp-6);
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
  gap: 12px;
}

.avatar {
  position: relative;
  flex: none;
  width: 34px;
  height: 34px;
}

.compte {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--g-avatar);
  color: var(--c-sur-accent);
  font-size: var(--fs-base);
  font-weight: 600;
}

.presence {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 11px;
  height: 11px;
  border: 2px solid var(--c-window);
  border-radius: 50%;
  background: var(--c-dim);
}

.presence--ouvert {
  background: var(--c-ok);
}

.presence--connexion {
  background: var(--c-warn);
}

.presence--ferme {
  background: var(--c-alert);
}

@media (max-width: 640px) {
  .entete {
    padding: var(--sp-4);
  }
}
</style>
