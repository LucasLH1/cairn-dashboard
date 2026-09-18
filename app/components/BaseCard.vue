<script setup lang="ts">
// La carte du design : coins de 14 px, filet, remplissage de 14 px, et un pas
// de 8 px entre ce qu'elle contient.
//
// Deux en-têtes y existent. La carte de liste porte un titre de 14,5 px, une
// pastille de compte et un lien à chevron à droite. La carte mise en avant,
// centrée, porte un titre de 16 px et un sous-titre discret.
defineProps<{
  titre: string
  sousTitre?: string
  /** Le nombre dans la pastille ronde, à côté du titre. */
  compte?: number | string
  /** Une étiquette à droite, quand il n'y a pas de lien. */
  mention?: string
  /** La carte mise en avant : centrée, titre de 16 px. */
  centre?: boolean
}>()
</script>

<template>
  <section class="carte" :class="{ 'carte--centre': centre }">
    <header v-if="centre" class="tete tete--centre">
      <h2 class="titre-centre">{{ titre }}</h2>
      <p v-if="sousTitre" class="sous-titre">{{ sousTitre }}</p>
    </header>

    <header v-else class="tete">
      <div class="gauche">
        <h2 class="titre">{{ titre }}</h2>
        <span v-if="compte !== undefined" class="compte">{{ compte }}</span>
        <p v-if="sousTitre" class="sous-titre sous-titre--ligne">{{ sousTitre }}</p>
      </div>
      <slot name="lien">
        <BaseEtiquette v-if="mention">{{ mention }}</BaseEtiquette>
      </slot>
    </header>

    <slot />
  </section>
</template>

<style scoped>
.carte {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: var(--sp-5);
  border: 1px solid var(--c-border);
  border-radius: var(--r-card);
  background: var(--c-card);
}

.carte--centre {
  align-items: center;
  padding: 14px 14px 12px;
  text-align: center;
}

.tete {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
}

.tete--centre {
  display: block;
}

.gauche {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-width: 0;
}

.titre {
  font-size: var(--fs-tuile);
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.titre-centre {
  font-size: var(--fs-card);
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.2;
}

.compte {
  display: grid;
  flex: none;
  place-items: center;
  width: 21px;
  height: 21px;
  border-radius: 50%;
  background: var(--c-tile);
  color: var(--c-muted);
  font-size: var(--fs-xs);
  font-weight: 500;
}

.sous-titre {
  margin-top: var(--sp-1);
  color: var(--c-muted);
  font-size: var(--fs-md);
  font-weight: 500;
}

.sous-titre--ligne {
  margin-top: 0;
  overflow: hidden;
  font-size: var(--fs-sous);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
