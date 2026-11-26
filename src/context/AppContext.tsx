import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getApi } from '../lib/api'
import type { Profile } from '../vite-env'

export type ThemeMode = 'light' | 'dark'

export type SetupStatus = {
  loading: boolean
  hasDiet: boolean
  hasWeight: boolean
  complete: boolean
}

type AppContextValue = {
  ready: boolean
  profiles: Profile[]
  activeProfile: Profile | null
  theme: ThemeMode
  setup: SetupStatus
  refreshProfiles: () => Promise<void>
  refreshSetup: () => Promise<void>
  createProfile: (name: string) => Promise<Profile>
  selectProfile: (profile: Profile | null) => Promise<void>
  deleteProfile: (id: number) => Promise<void>
  setTheme: (theme: ThemeMode) => Promise<void>
  toggleTheme: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

const ACTIVE_PROFILE_KEY = 'activeProfileId'
const THEME_KEY = 'theme'

const emptySetup: SetupStatus = {
  loading: true,
  hasDiet: false,
  hasWeight: false,
  complete: false,
}

export function AppProvider({ children }: { children: ReactNode }) {
  const api = useMemo(() => getApi(), [])
  const [ready, setReady] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [theme, setThemeState] = useState<ThemeMode>('light')
  const [setup, setSetup] = useState<SetupStatus>(emptySetup)

  const applyTheme = useCallback((next: ThemeMode) => {
    document.documentElement.setAttribute('data-theme', next)
    setThemeState(next)
  }, [])

  const refreshProfiles = useCallback(async () => {
    const list = await api.listProfiles()
    setProfiles(list)
    return list
  }, [api])

  const refreshSetup = useCallback(async () => {
    if (!activeProfile) {
      setSetup(emptySetup)
      return
    }

    setSetup((prev) => ({ ...prev, loading: true }))
    try {
      const [meals, weights] = await Promise.all([
        api.listDietMeals(activeProfile.id),
        api.listWeights(activeProfile.id, 1),
      ])
      const hasDiet = meals.length > 0
      const hasWeight = weights.length > 0
      setSetup({
        loading: false,
        hasDiet,
        hasWeight,
        complete: hasDiet && hasWeight,
      })
    } catch {
      setSetup({
        loading: false,
        hasDiet: false,
        hasWeight: false,
        complete: false,
      })
    }
  }, [activeProfile, api])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      const [list, savedTheme, savedProfileId] = await Promise.all([
        api.listProfiles(),
        api.getSetting(THEME_KEY),
        api.getSetting(ACTIVE_PROFILE_KEY),
      ])

      if (cancelled) return

      setProfiles(list)
      applyTheme(savedTheme === 'dark' ? 'dark' : 'light')

      if (savedProfileId) {
        const found = list.find((p) => String(p.id) === savedProfileId) ?? null
        setActiveProfile(found)
      }

      setReady(true)
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [api, applyTheme])

  useEffect(() => {
    void refreshSetup()
  }, [refreshSetup])

  const createProfile = useCallback(
    async (name: string) => {
      const profile = await api.createProfile(name)
      await refreshProfiles()
      setActiveProfile(profile)
      await api.setSetting(ACTIVE_PROFILE_KEY, String(profile.id))
      return profile
    },
    [api, refreshProfiles],
  )

  const selectProfile = useCallback(
    async (profile: Profile | null) => {
      setActiveProfile(profile)
      await api.setSetting(
        ACTIVE_PROFILE_KEY,
        profile ? String(profile.id) : '',
      )
    },
    [api],
  )

  const deleteProfile = useCallback(
    async (id: number) => {
      await api.deleteProfile(id)
      const list = await refreshProfiles()
      if (activeProfile?.id === id) {
        const next = list[0] ?? null
        await selectProfile(next)
      }
    },
    [activeProfile?.id, api, refreshProfiles, selectProfile],
  )

  const setTheme = useCallback(
    async (next: ThemeMode) => {
      applyTheme(next)
      await api.setSetting(THEME_KEY, next)
    },
    [api, applyTheme],
  )

  const toggleTheme = useCallback(async () => {
    await setTheme(theme === 'light' ? 'dark' : 'light')
  }, [setTheme, theme])

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      profiles,
      activeProfile,
      theme,
      setup,
      refreshProfiles: async () => {
        await refreshProfiles()
      },
      refreshSetup,
      createProfile,
      selectProfile,
      deleteProfile,
      setTheme,
      toggleTheme,
    }),
    [
      ready,
      profiles,
      activeProfile,
      theme,
      setup,
      refreshProfiles,
      refreshSetup,
      createProfile,
      selectProfile,
      deleteProfile,
      setTheme,
      toggleTheme,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider')
  return ctx
}
