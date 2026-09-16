<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Cairn Dashboard — accès refusé' })
</script>

<template>
  <PanneauAcces>
    <section class="carte">
      <span class="marque" aria-hidden="true">✕</span>

      <div class="titres">
        <h2>Accès refusé</h2>
        <p class="mention">
          Ce compte GitHub n'est pas celui auquel ce site est réservé.
          Aucune session n'a été ouverte.
        </p>
      </div>

      <a class="bouton" href="/connexion">Revenir à la connexion</a>

      <span class="filet" />

      <p class="note">
        Le compte autorisé est reconnu par son identifiant, jamais par son nom.
      </p>
    </section>
  </PanneauAcces>
</template>

<style scoped>
.carte {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  width: min(360px, 100%);
  padding: var(--sp-6);
  border: 1px solid var(--c-border);
  border-radius: var(--r-card);
  background: var(--c-card);
  box-shadow: var(--sh-frame);
  text-align: center;
}

/* Même carré encadré que la marque, dans la couleur d'alerte du design */
.marque {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--c-alert);
  border-radius: var(--r-rail);
  background: var(--c-alert-fond);
  color: var(--c-alert);
  font-size: var(--fs-lg);
}

.titres {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.mention {
  color: var(--c-muted);
  font-size: var(--fs-md);
}

.bouton {
  width: 100%;
  margin-top: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--c-border);
  border-radius: var(--r-tile);
  background: var(--c-tile);
  color: var(--c-text);
  font-size: var(--fs-base);
  font-weight: 600;
}

.bouton:hover {
  background: var(--c-card);
  color: var(--c-text);
}

.filet {
  width: 100%;
  height: 1px;
  margin-top: var(--sp-2);
  background: var(--c-border);
}

.note {
  color: var(--c-dim);
  font-size: var(--fs-xs);
}
</style>
