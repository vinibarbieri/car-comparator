import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OwnedVehicle, NewPurchase, Scenario } from './types'

type ScenarioStore = Scenario & {
  addOwnedVehicle: (vehicle: OwnedVehicle) => void
  updateOwnedVehicle: (id: string, updates: Partial<OwnedVehicle>) => void
  removeOwnedVehicle: (id: string) => void
  addNewPurchase: (purchase: NewPurchase) => void
  updateNewPurchase: (id: string, updates: Partial<NewPurchase>) => void
  removeNewPurchase: (id: string) => void
  setTimelineYears: (years: 1 | 2 | 3 | 4 | 5) => void
  setIpvaRate: (rate: number) => void
  reset: () => void
}

const defaultScenario: Scenario = {
  ownedVehicles: [],
  newPurchases: [],
  timelineYears: 3,
  ipvaRatePct: 2,
}

export const useScenarioStore = create<ScenarioStore>()(
  persist(
    (set) => ({
      ...defaultScenario,

      addOwnedVehicle: (vehicle) =>
        set((s) => ({ ownedVehicles: [...s.ownedVehicles, vehicle] })),

      updateOwnedVehicle: (id, updates) =>
        set((s) => ({
          ownedVehicles: s.ownedVehicles.map((v) =>
            v.id === id ? { ...v, ...updates } : v,
          ),
        })),

      removeOwnedVehicle: (id) =>
        set((s) => ({ ownedVehicles: s.ownedVehicles.filter((v) => v.id !== id) })),

      addNewPurchase: (purchase) =>
        set((s) => ({ newPurchases: [...s.newPurchases, purchase] })),

      updateNewPurchase: (id, updates) =>
        set((s) => ({
          newPurchases: s.newPurchases.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        })),

      removeNewPurchase: (id) =>
        set((s) => ({ newPurchases: s.newPurchases.filter((p) => p.id !== id) })),

      setTimelineYears: (years) => set({ timelineYears: years }),
      setIpvaRate: (rate) => set({ ipvaRatePct: rate }),
      reset: () => set(defaultScenario),
    }),
    { name: 'garage-scenario', version: 1 },
  ),
)
