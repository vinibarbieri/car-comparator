import type { FuelType, OwnedVehicle } from './types'
import type { FipeVehicle } from '@/lib/fipe/types'
import { parseFipeValue } from '@/lib/utils'

export type SeedConfig = {
  id: string
  makeId: string
  makeName: string
  modelId: number
  modelName: string
  yearId: string
  yearName: string
  fuelType: FuelType
  fipeCode: string
  annualInsurance: number
  annualMaintenance: number
  annualKm: number
  fuelPricePerLiter: number
  kmPerLiter: number
}

export const SEED_CONFIGS: SeedConfig[] = [
  {
    id: 'seed-mercedes-c200-2025',
    makeId: '39',
    makeName: 'Mercedes-Benz',
    modelId: 10134,
    modelName: 'C-200 AMG Line EQ Boost 1.5 TB (Hib.)',
    yearId: '2025-6',
    yearName: '2025 Híbrido',
    fuelType: 'hybrid',
    fipeCode: '021468-0',
    annualInsurance: 8500,
    annualMaintenance: 4500,
    annualKm: 15000,
    fuelPricePerLiter: 6.20,
    kmPerLiter: 12,
  },
  {
    id: 'seed-volvo-xc40-2021',
    makeId: '58',
    makeName: 'Volvo',
    modelId: 9929,
    modelName: 'XC 40 T-5 INSCRIPTION 1.5 FWD (Híbrido)',
    yearId: '2021-6',
    yearName: '2021 Híbrido',
    fuelType: 'hybrid',
    fipeCode: '029146-3',
    annualInsurance: 7757,
    annualMaintenance: 10000,
    annualKm: 15000,
    fuelPricePerLiter: 6.20,
    kmPerLiter: 11,
  },
]

export function buildSeedVehicle(config: SeedConfig, fipeData: FipeVehicle): OwnedVehicle {
  return {
    id: config.id,
    fipe: {
      makeId: config.makeId,
      makeName: config.makeName,
      modelId: config.modelId,
      modelName: config.modelName,
      yearId: config.yearId,
      yearName: config.yearName,
      currentValue: parseFipeValue(fipeData.Valor),
      fuelType: config.fuelType,
      fipeCode: config.fipeCode,
    },
    decision: 'keep',
    annualInsurance: config.annualInsurance,
    annualMaintenance: config.annualMaintenance,
    annualKm: config.annualKm,
    fuelPricePerLiter: config.fuelPricePerLiter,
    kmPerLiter: config.kmPerLiter,
  }
}
