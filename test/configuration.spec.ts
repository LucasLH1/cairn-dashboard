import { describe, expect, it } from 'vitest'
import { LONGUEUR_MINIMALE_SECRET, etatConnexion } from '../server/utils/configuration'

const complet = {
  sessionPassword: 'x'.repeat(64),
  allowedGithubId: '68059501',
  oauth: { github: { clientId: 'identifiant', clientSecret: 'secret' } },
}

describe('etatConnexion', () => {
  it('accepte une configuration complète', () => {
    expect(etatConnexion(complet)).toBe('ok')
  })

  it('refuse un secret de session absent', () => {
    expect(etatConnexion({ ...complet, sessionPassword: '' })).toBe('secret-de-session-absent')
    expect(etatConnexion({ ...complet, sessionPassword: undefined })).toBe('secret-de-session-absent')
    expect(etatConnexion({ ...complet, sessionPassword: null })).toBe('secret-de-session-absent')
  })

  it('refuse un secret trop court — le cas rencontré en production', () => {
    // Une valeur tronquée à la saisie : l'application démarre, mais personne
    // ne peut ouvrir de session.
    expect(etatConnexion({ ...complet, sessionPassword: 'x'.repeat(16) }))
      .toBe('secret-de-session-trop-court')
    expect(etatConnexion({ ...complet, sessionPassword: 'x'.repeat(LONGUEUR_MINIMALE_SECRET - 1) }))
      .toBe('secret-de-session-trop-court')
    expect(etatConnexion({ ...complet, sessionPassword: 'x'.repeat(LONGUEUR_MINIMALE_SECRET) }))
      .toBe('ok')
  })

  it('refuse des identifiants OAuth incomplets', () => {
    expect(etatConnexion({ ...complet, oauth: { github: { clientId: '', clientSecret: 's' } } }))
      .toBe('identifiants-oauth-absents')
    expect(etatConnexion({ ...complet, oauth: { github: { clientId: 'i', clientSecret: '' } } }))
      .toBe('identifiants-oauth-absents')
    expect(etatConnexion({ ...complet, oauth: {} })).toBe('identifiants-oauth-absents')
  })

  it('refuse un compte autorisé absent ou non numérique', () => {
    expect(etatConnexion({ ...complet, allowedGithubId: '' })).toBe('compte-autorise-absent')
    expect(etatConnexion({ ...complet, allowedGithubId: 'LucasLH1' })).toBe('compte-autorise-absent')
    expect(etatConnexion({ ...complet, allowedGithubId: ' 68059501 ' })).toBe('ok')
  })

  it('accepte les valeurs telles que la configuration les livre vraiment', () => {
    // Les variables d'environnement sont converties selon leur contenu :
    // un identifiant numérique arrive comme un nombre, et un secret composé
    // de chiffres aussi. C'est ce qui a fait tomber /health en 500.
    expect(etatConnexion({ ...complet, allowedGithubId: 68059501 })).toBe('ok')
    expect(etatConnexion({ ...complet, allowedGithubId: 1.5 })).toBe('compte-autorise-absent')
    expect(etatConnexion({ ...complet, sessionPassword: 12345678901234567890n }))
      .toBe('secret-de-session-trop-court')
    expect(etatConnexion({ ...complet, sessionPassword: Number('1'.repeat(15)) }))
      .toBe('secret-de-session-trop-court')
    expect(etatConnexion({ ...complet, oauth: { github: { clientId: 123456, clientSecret: 654321 } } }))
      .toBe('ok')
  })
})
