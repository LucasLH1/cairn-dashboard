<script setup lang="ts">
// Ossature des écrans d'accès — connexion et refus. Le design ne montre aucun
// écran de ce genre : il est bâti avec ses briques (règle 7), sur le fond le
// plus profond de sa palette, celui qu'aucun autre écran n'emploie.
//
// Le panneau dit ce que ce site donne à voir ; la carte, à droite, porte
// l'action. Les repères reprennent les icônes du rail, pour que l'on
// reconnaisse les sections avant même d'entrer.
const reperes = [
  { icone: 'documentation', titre: 'Documentation', texte: 'Les documents de cairn-wms, lus à la source.' },
  { icone: 'avancement', titre: 'Avancement', texte: 'Les tranches et leur état, tels que le dépôt les porte.' },
  { icone: 'journal', titre: 'Activité', texte: 'Le journal des sessions et le fil des événements.' },
]
</script>

<template>
  <main class="ecran">
    <section class="presentation">
      <div class="bloc">
        <div class="entete">
          <AppMarque :taille="34" />
          <p class="nom">Cairn Dashboard</p>
        </div>

        <div class="propos">
          <h1>Le suivi de Cairn WMS, lu et écrit dans GitHub.</h1>
          <p class="precision">
            Le dépôt cairn-wms reste la source de vérité. Ce site n'en est qu'une vue :
            il n'héberge aucune donnée qui lui soit propre.
          </p>
        </div>

        <ul class="reperes">
          <li v-for="repere in reperes" :key="repere.icone">
            <span class="jeton"><AppIcone :nom="repere.icone" /></span>
            <span class="corps">
              <span class="repere-titre">{{ repere.titre }}</span>
              <span class="repere-texte">{{ repere.texte }}</span>
            </span>
          </li>
        </ul>
      </div>
    </section>

    <section class="acces">
      <slot />
    </section>
  </main>
</template>

<style scoped>
.ecran {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  min-height: 100vh;
  background: var(--g-page);
}

.presentation {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding: 40px 36px;
  background: var(--c-side);
  border-right: 1px solid var(--c-border);
}

/* Le bloc se centre dans son panneau ; le texte, lui, reste aligné à gauche. */
.bloc {
  display: flex;
  flex-direction: column;
  gap: var(--sp-6);
  width: min(44ch, 100%);
  margin-inline: auto;
}

.entete {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}

.nom {
  font-size: var(--fs-card);
  font-weight: 600;
  letter-spacing: -0.015em;
}

.propos {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

h1 {
  line-height: 1.25;
}

.precision {
  color: var(--c-muted);
  font-size: var(--fs-md);
}

.reperes {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.reperes li {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: 8px 10px;
  border-radius: var(--r-tile);
  background: var(--c-tile);
}

.jeton {
  display: grid;
  flex: none;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: var(--r-rail);
  background: var(--c-card);
  color: var(--c-muted);
}

.corps {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.repere-titre {
  font-size: var(--fs-base);
}

.repere-texte {
  color: var(--c-muted);
  font-size: var(--fs-sm);
}

.acces {
  display: grid;
  place-items: center;
  min-width: 0;
  padding: var(--sp-6);
}

@media (min-width: 1200px) {
  .presentation {
    padding: 56px 52px;
  }
}

/* En étroit, le panneau passe au-dessus et se resserre : l'action reste à
   portée sans faire défiler. */
@media (max-width: 860px) {
  .ecran {
    grid-template-columns: minmax(0, 1fr);
  }

  .presentation {
    padding: 26px 20px;
    border-right: 0;
    border-bottom: 1px solid var(--c-border);
  }

  .bloc {
    gap: var(--sp-5);
  }

  .acces {
    padding: var(--sp-5) var(--sp-4);
  }
}
</style>
