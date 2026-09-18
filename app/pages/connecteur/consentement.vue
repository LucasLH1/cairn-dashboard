<script setup lang="ts">
// L'écran de consentement du connecteur MCP — fiche 0011.
//
// Il montre ce que la spécification demande de montrer : qui demande, où le
// code partira, et ce qui sera accordé. La décision part par un formulaire
// ordinaire vers le serveur d'autorisation, qui vérifie l'origine, la session
// et la demande scellée avant d'émettre quoi que ce soit.
definePageMeta({ titre: 'Connecteur' })
useHead({ title: 'Cairn Dashboard — consentement' })

const { data } = await useFetch<{
  client?: string
  hote?: string
  ressource?: string
  portees?: string[]
  echec?: string
}>('/api/connecteur/demande', { default: () => ({}) })

const PORTEES: Record<string, { titre: string, detail: string }> = {
  'docs:read': { titre: 'Lire la documentation', detail: 'L\'arbre et le contenu de docs/ dans cairn-wms, sur dev.' },
  'docs:write': { titre: 'Alimenter la documentation', detail: 'Créer ou modifier un document de docs/ dans cairn-wms, sur dev, par un commit « docs: ». Rien d\'autre.' },
}
</script>

<template>
  <ZonePrincipale>
    <section class="cadre">
      <BaseCard v-if="data?.echec || !data?.client" titre="Aucune demande en attente" class="carte">
        <EtatVide
          message="Aucun client n'attend votre consentement."
          mention="Recommencez depuis Claude : la demande n'a pas plus de dix minutes."
        />
      </BaseCard>

      <BaseCard v-else titre="Autoriser Claude ?" class="carte">
        <template #lien>
          <BaseEtiquette teinte="info">OAuth</BaseEtiquette>
        </template>

        <p class="propos">
          Un client demande à lire et alimenter la documentation de cairn-wms par ce dashboard,
          en votre nom.
        </p>

        <div class="identite">
          <BaseTuile libelle="Client" :valeur="data.client" />
          <BaseTuile libelle="Le code d'autorisation partira vers" :valeur="data.hote" />
          <BaseTuile libelle="Pour le serveur" :valeur="data.ressource" />
        </div>

        <div class="portees">
          <LigneListe
            v-for="p in data.portees"
            :key="p"
            :titre="PORTEES[p]?.titre ?? p"
            :sous="PORTEES[p]?.detail"
            :courant="p === 'docs:write'"
          />
        </div>

        <form method="post" action="/oauth/autoriser" class="decision">
          <BoutonPrimaire type="submit" name="decision" value="accepter">Autoriser</BoutonPrimaire>
          <BoutonSecondaire type="submit" name="decision" value="refuser">Refuser</BoutonSecondaire>
        </form>

        <p class="note">
          L'autorisation vaut trente jours d'usage, pour ce seul client, et se révoque en le
          retirant de Claude.
        </p>
      </BaseCard>
    </section>
  </ZonePrincipale>
</template>

<style scoped>
.cadre {
  display: flex;
  justify-content: center;
}

.carte {
  width: min(560px, 100%);
}

.propos {
  color: var(--c-muted);
  font-size: var(--fs-base);
  line-height: 1.5;
}

.identite {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}

.portees {
  display: flex;
  flex-direction: column;
}

.decision {
  display: flex;
  gap: var(--sp-4);
  margin-top: var(--sp-2);
}

.decision > * {
  flex: 1;
}

.note {
  color: var(--c-dim);
  font-size: var(--fs-sm);
}
</style>
