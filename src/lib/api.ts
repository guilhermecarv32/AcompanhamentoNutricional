import type { AppApi, Profile } from '../vite-env'

const memoryProfiles: Profile[] = []
const memorySettings = new Map<string, string>()

function browserFallback(): AppApi {
  console.warn(
    '[api] Rodando no navegador sem Electron — usando armazenamento em memória.',
  )

  return {
    async listProfiles() {
      return [...memoryProfiles].sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR'),
      )
    },
    async createProfile(name) {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Nome do perfil é obrigatório.')
      if (memoryProfiles.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error('Já existe um perfil com esse nome.')
      }
      const now = new Date().toISOString()
      const profile: Profile = {
        id: Date.now(),
        name: trimmed,
        created_at: now,
        updated_at: now,
      }
      memoryProfiles.push(profile)
      return profile
    },
    async renameProfile(id, name) {
      const trimmed = name.trim()
      const profile = memoryProfiles.find((p) => p.id === id)
      if (!profile) throw new Error('Perfil não encontrado.')
      profile.name = trimmed
      profile.updated_at = new Date().toISOString()
      return { ...profile }
    },
    async deleteProfile(id) {
      const index = memoryProfiles.findIndex((p) => p.id === id)
      if (index >= 0) memoryProfiles.splice(index, 1)
      return { ok: true }
    },
    async getSetting(key) {
      return memorySettings.get(key) ?? null
    },
    async setSetting(key, value) {
      memorySettings.set(key, value)
      return { ok: true }
    },
    async getPaths() {
      return { dataDir: '(memória)', dbPath: '(memória)' }
    },
  }
}

export function getApi(): AppApi {
  if (typeof window !== 'undefined' && window.api) return window.api
  return browserFallback()
}
