import { describe, expect, it } from 'vitest'
import { cheminPublic } from '../server/utils/acces'

describe('cheminPublic', () => {
  it('laisse passer le contrat de service', () => {
    expect(cheminPublic('/version')).toBe(true)
    expect(cheminPublic('/health')).toBe(true)
  })

  it('laisse passer le parcours de connexion et ses écrans', () => {
    expect(cheminPublic('/connexion')).toBe(true)
    expect(cheminPublic('/refus')).toBe(true)
    expect(cheminPublic('/auth/github')).toBe(true)
    expect(cheminPublic('/auth/deconnexion')).toBe(true)
  })

  it('laisse passer les ressources de l\'interface', () => {
    expect(cheminPublic('/_nuxt/entry.css')).toBe(true)
    expect(cheminPublic('/fonts/dm-sans-latin.woff2')).toBe(true)
    expect(cheminPublic('/favicon.svg')).toBe(true)
  })

  it('ferme tout le reste', () => {
    expect(cheminPublic('/')).toBe(false)
    expect(cheminPublic('/api/moi')).toBe(false)
    expect(cheminPublic('/_payload.json')).toBe(false)
    expect(cheminPublic('/documentation')).toBe(false)
    expect(cheminPublic('/versionnage')).toBe(false)
    expect(cheminPublic('/health-check')).toBe(false)
    expect(cheminPublic('/connexion/../interne')).toBe(false)
  })
})
