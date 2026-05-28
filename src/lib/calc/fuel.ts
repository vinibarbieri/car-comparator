import type { FuelType } from '@/store/types'

export function computeAnnualFuel(
  annualKm: number,
  kmPerLiter: number,
  fuelPricePerLiter: number,
  fuelType: FuelType,
): number {
  if (kmPerLiter <= 0 || annualKm <= 0) return 0
  if (fuelType === 'electric') {
    // kmPerLiter = kWh/100km; fuelPricePerLiter = R$/kWh
    return (annualKm / 100) * kmPerLiter * fuelPricePerLiter
  }
  return (annualKm / kmPerLiter) * fuelPricePerLiter
}
