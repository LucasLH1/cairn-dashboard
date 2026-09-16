<script setup lang="ts">
// Icônes du rail. L'export du design n'en contient aucune en SVG : elles y sont
// dessinées avec des blocs CSS à la couleur du texte courant. On reprend les
// mêmes briques — carrés, cercles, traits — plutôt que d'ajouter une
// bibliothèque d'icônes, qui serait un choix engageant (règle 2).
//
// « Vue d'ensemble », « Documentation », « Tickets », « Journal » et « Quitter »
// sont reprises telles quelles du design. « Avancement » et « Déploiements » n'y
// figurent pas : elles sont composées des mêmes briques (règle 7).
defineProps<{ nom: string }>()
</script>

<template>
  <span class="icone" :class="`icone--${nom}`" aria-hidden="true">
    <template v-if="nom === 'vue-ensemble'">
      <span class="pave" />
      <span class="pave" />
      <span class="pave" />
      <span class="pave" />
    </template>

    <template v-else-if="nom === 'documentation'">
      <span class="ligne" />
      <span class="ligne" />
      <span class="ligne ligne--courte" />
    </template>

    <template v-else-if="nom === 'avancement'">
      <span class="barre barre--une" />
      <span class="barre barre--deux" />
      <span class="barre barre--trois" />
    </template>

    <template v-else-if="nom === 'tickets'">
      <span class="trait" />
    </template>

    <template v-else-if="nom === 'journal'">
      <span class="aiguille aiguille--haute" />
      <span class="aiguille aiguille--large" />
    </template>

    <template v-else-if="nom === 'deploiements'">
      <span class="hampe" />
      <span class="pointe" />
      <span class="socle" />
    </template>

    <template v-else-if="nom === 'quitter'">
      <span class="sortie" />
    </template>
  </span>
</template>

<style scoped>
.icone {
  display: block;
  color: inherit;
}

/* Vue d'ensemble — quatre pavés, comme dans le design */
.icone--vue-ensemble {
  display: grid;
  grid-template-columns: 7px 7px;
  grid-template-rows: 7px 7px;
  gap: 3px;
}

.pave {
  background: currentcolor;
  border-radius: 2px;
}

/* Documentation — une page et ses lignes */
.icone--documentation {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2.5px;
  width: 14px;
  height: 18px;
  padding: 0 3px;
  border: 1.5px solid currentcolor;
  border-radius: 3px;
}

.ligne {
  height: 1.5px;
  background: currentcolor;
}

.ligne--courte {
  width: 60%;
}

/* Avancement — absente du design, bâtie avec ses briques : trois barres */
.icone--avancement {
  display: flex;
  align-items: flex-end;
  gap: 2.5px;
  width: 16px;
  height: 16px;
}

.barre {
  width: 3px;
  background: currentcolor;
  border-radius: 2px;
}

.barre--une {
  height: 7px;
}

.barre--deux {
  height: 11px;
}

.barre--trois {
  height: 15px;
}

/* Tickets — la fiche du design : un cadre et son bandeau */
.icone--tickets {
  position: relative;
  width: 17px;
  height: 15px;
  border: 1.5px solid currentcolor;
  border-radius: 3px;
}

.trait {
  position: absolute;
  right: -1.5px;
  left: -1.5px;
  top: 4px;
  height: 1.5px;
  background: currentcolor;
}

/* Journal — le cadran du design, qui dit la chronologie */
.icone--journal {
  position: relative;
  width: 16px;
  height: 16px;
  border: 1.5px solid currentcolor;
  border-radius: 50%;
}

.aiguille {
  position: absolute;
  background: currentcolor;
}

.aiguille--haute {
  left: 6.5px;
  top: 3px;
  width: 1.5px;
  height: 5px;
}

.aiguille--large {
  left: 7px;
  top: 7px;
  width: 4px;
  height: 1.5px;
}

/* Déploiements — absente du design : une montée posée sur son socle */
.icone--deploiements {
  position: relative;
  width: 16px;
  height: 16px;
}

.hampe {
  position: absolute;
  left: 7.25px;
  top: 2px;
  width: 1.5px;
  height: 9px;
  background: currentcolor;
  border-radius: 1px;
}

/* La pointe reprend la brique du losange de la marque : un carré à deux
   bordures, tourné d'un quart. */
.pointe {
  position: absolute;
  left: 4px;
  top: 3px;
  width: 8px;
  height: 8px;
  border-top: 1.5px solid currentcolor;
  border-left: 1.5px solid currentcolor;
  border-radius: 1px;
  transform: rotate(45deg);
}

.socle {
  position: absolute;
  right: 1px;
  bottom: 1.5px;
  left: 1px;
  height: 1.5px;
  background: currentcolor;
  border-radius: 1px;
}

/* Quitter — la porte du design, ouverte à droite */
.icone--quitter {
  position: relative;
  width: 14px;
  height: 14px;
  border: 1.5px solid currentcolor;
  border-right-color: transparent;
  border-radius: 3px;
}

.sortie {
  position: absolute;
  right: -6px;
  top: 5px;
  width: 9px;
  height: 1.5px;
  background: currentcolor;
}
</style>
