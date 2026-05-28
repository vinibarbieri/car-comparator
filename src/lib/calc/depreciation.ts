import type { FuelType } from '@/store/types'

/**
 * Which depreciation schedule applies to a vehicle.
 * - 'ice': ICE engines (gasoline, ethanol, diesel, flex) and hybrids.
 * - 'ev':  Electric vehicles and explicitly-flagged premium models.
 *
 * EVs/premiums lose value faster in early years (technology turnover and
 * luxury-market dynamics) but the tail rate is also slightly higher.
 */
export type DepreciationCurve = 'ice' | 'ev'

// Rates applied to *remaining* asset value in the year the vehicle turns that age.
// Index 0 = age 1, index 5 = age 6; age 7+ uses the tail rate.
const ICE_RATES: ReadonlyArray<number> = [0.18, 0.12, 0.10, 0.08, 0.08, 0.08]
const ICE_TAIL_RATE = 0.04 // age 7+

const EV_RATES: ReadonlyArray<number> = [0.25, 0.15, 0.12, 0.09, 0.09, 0.09]
const EV_TAIL_RATE = 0.05 // age 7+

/**
 * Returns the annual depreciation rate for a vehicle at a given age.
 *
 * @param vehicleAge  Vehicle age in years (1-indexed: 1 = first year of life)
 * @param curve       'ice' or 'ev'
 */
function rateForAge(vehicleAge: number, curve: DepreciationCurve): number {
  const rates = curve === 'ev' ? EV_RATES : ICE_RATES
  const tailRate = curve === 'ev' ? EV_TAIL_RATE : ICE_TAIL_RATE
  const idx = vehicleAge - 1
  return idx >= 0 && idx < rates.length ? rates[idx] : tailRate
}

/**
 * Determines which depreciation curve applies to a vehicle.
 * Electric vehicles automatically use the EV curve; all other fuel types
 * use the ICE curve unless the caller explicitly marks the vehicle as premium.
 *
 * @param fuelType   Vehicle fuel type from the store
 * @param isPremium  True to force the EV/Premium curve (e.g. luxury brands)
 */
export function getDepreciationCurve(fuelType: FuelType, isPremium = false): DepreciationCurve {
  if (fuelType === 'electric' || isPremium) return 'ev'
  return 'ice'
}

/**
 * Projects the market value of a vehicle `yearsFromNow` years into the future
 * using a non-linear, age-aware step-down curve.
 *
 * Each simulation year applies the rate that corresponds to the vehicle's
 * actual age in that year (vehicleAgeNow + year). Older vehicles carry lower
 * marginal rates, producing a flattening curve that reflects utility-value
 * pricing rather than an aggressive straight-line drop to zero.
 *
 * @param currentValue    Current FIPE market value in R$
 * @param vehicleAgeNow   Vehicle age in full years at simulation start (0 = brand new)
 * @param yearsFromNow    Number of years to project forward (0 returns currentValue unchanged)
 * @param curve           Depreciation schedule to apply
 * @returns               Projected market value in R$
 *
 * @example
 * // New EV purchased today (age 0), 3 years forward:
 * // year 1 → age 1: −25 % → 75 000
 * // year 2 → age 2: −15 % → 63 750
 * // year 3 → age 3: −12 % → 56 100
 * projectVehicleValue(100_000, 0, 3, 'ev') // ≈ 56 100
 */
export function projectVehicleValue(
  currentValue: number,
  vehicleAgeNow: number,
  yearsFromNow: number,
  curve: DepreciationCurve = 'ice',
): number {
  if (yearsFromNow <= 0) return currentValue
  let value = currentValue
  for (let i = 1; i <= yearsFromNow; i++) {
    value *= 1 - rateForAge(vehicleAgeNow + i, curve)
  }
  return value
}

/**
 * Parses a vehicle's age in full years from a FIPE yearId string (format: "YYYY-N").
 * The "-N" suffix is the FIPE fuel-type discriminator and is ignored.
 *
 * @param yearId        FIPE year identifier, e.g. "2022-1"
 * @param referenceYear The year to measure age from (defaults to the current calendar year)
 * @returns             Age in full years, minimum 0
 */
export function vehicleAgeFromYearId(yearId: string, referenceYear = new Date().getFullYear()): number {
  const modelYear = parseInt(yearId.split('-')[0], 10)
  return Math.max(0, referenceYear - modelYear)
}
