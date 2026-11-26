/// <reference types="vite/client" />

export type Profile = {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export type AppApi = {
  listProfiles: () => Promise<Profile[]>
  createProfile: (name: string) => Promise<Profile>
  renameProfile: (id: number, name: string) => Promise<Profile>
  deleteProfile: (id: number) => Promise<{ ok: boolean }>
  getSetting: (key: string) => Promise<string | null>
  setSetting: (key: string, value: string) => Promise<{ ok: boolean }>
  getPaths: () => Promise<{ dataDir: string; dbPath: string }>
  minimizeWindow?: () => Promise<void>
  maximizeToggle?: () => Promise<boolean>
  closeWindow?: () => Promise<void>
  isWindowMaximized?: () => Promise<boolean>
}

declare global {
  interface Window {
    api: AppApi
  }
}

export {}
