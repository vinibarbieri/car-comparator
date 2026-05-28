import { getYears } from '@/lib/fipe/client'
import type { FuelType } from '@/store/types'

// ─── Rates & penalties (all in percentage points) ────────────────────────────

const MAX_RATE_PCT = 12

/**
 * Base annual premium rate by vehicle category.
 *
 * - standard: ICE engines and hybrids
 * - premium:  Electric vehicles and luxury brands (higher repair costs / parts scarcity)
 */
const BASE_RATE_PCT: Record<InsuranceCategory, number> = {
  standard: 3.5,
  premium: 5.0,
}

/**
 * Compounding age penalty added per year of vehicle age.
 * Older vehicles have worn parts and lower OEM availability, raising claim costs.
 */
const AGE_PENALTY_PCT: Record<InsuranceCategory, number> = {
  standard: 0.2,
  premium: 0.3,
}

/**
 * Flat surcharge applied when a model has been discontinued.
 * Scarcity of genuine parts increases repair costs and total-loss risk.
 */
const DISCONTINUED_PENALTY_PCT = 1.0

// ─── Premium brand classification ────────────────────────────────────────────

/**
 * Manufacturer names (lower-cased) that always receive the premium base rate,
 * regardless of fuel type. Matches how insurers segment luxury-brand risk pools.
 */
const PREMIUM_BRANDS: ReadonlySet<string> = new Set([
  'mercedes-benz',
  'bmw',
  'audi',
  'porsche',
  'ferrari',
  'lamborghini',
  'maserati',
  'bentley',
  'rolls-royce',
  'jaguar',
  'land rover',
  'aston martin',
  'bugatti',
])

// ─── Types ────────────────────────────────────────────────────────────────────

export type InsuranceCategory = 'standard' | 'premium'

export type InsuranceRateResult = {
  /** Computed annual insurance premium in R$, rounded to the nearest real. */
  annualPremium: number
  /** Final rate percentage applied to the FIPE value (after all penalties and cap). */
  effectiveRatePct: number
  /** Category used for base rate and age penalty selection. */
  category: InsuranceCategory
  /** Vehicle age in full years at the reference date. */
  ageYears: number
  /** Whether the discontinued-model penalty was applied. */
  isDiscontinued: boolean
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function resolveCategory(fuelType: FuelType, makeName: string): InsuranceCategory {
  if (fuelType === 'electric') return 'premium'
  if (PREMIUM_BRANDS.has(makeName.toLowerCase())) return 'premium'
  return 'standard'
}

function modelYearFromYearId(yearId: string): number {
  // yearId format: "YYYY-N" where N is FIPE's fuel-type discriminator
  return parseInt(yearId.split('-')[0], 10)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Pure sync calculation — use once discontinuation status has already been resolved
 * (e.g. from a cached FIPE query or in tests where network calls are undesirable).
 *
 * Formula:
 *   rate = BASE_RATE[category]
 *        + (ageYears × AGE_PENALTY[category])
 *        + (isDiscontinued ? 1.0 : 0)
 *   rate = min(rate, 12%)
 *   annualPremium = round(fipeValue × rate / 100)
 *
 * @param fipeValue       Current FIPE market value in R$
 * @param fuelType        Vehicle fuel type from the store
 * @param makeName        Manufacturer name (used to classify premium brands)
 * @param yearId          FIPE year identifier, e.g. "2021-6"
 * @param isDiscontinued  Whether the discontinued-model surcharge applies
 * @param currentYear     Reference year for age calculation (defaults to today's year)
 */
export function computeInsuranceRate({
  fipeValue,
  fuelType,
  makeName,
  yearId,
  isDiscontinued,
  currentYear = new Date().getFullYear(),
}: {
  fipeValue: number
  fuelType: FuelType
  makeName: string
  yearId: string
  isDiscontinued: boolean
  currentYear?: number
}): InsuranceRateResult {
  const category = resolveCategory(fuelType, makeName)
  const ageYears = Math.max(0, currentYear - modelYearFromYearId(yearId))

  let ratePct = BASE_RATE_PCT[category]
  ratePct += ageYears * AGE_PENALTY_PCT[category]
  if (isDiscontinued) ratePct += DISCONTINUED_PENALTY_PCT
  ratePct = Math.min(ratePct, MAX_RATE_PCT)

  return {
    annualPremium: Math.round(fipeValue * (ratePct / 100)),
    effectiveRatePct: ratePct,
    category,
    ageYears,
    isDiscontinued,
  }
}

/**
 * Pure sync version of the discontinued check — use when years are already cached
 * (e.g. from a TanStack Query result inside a dialog that already fetched them).
 *
 * A model is discontinued when its newest available year in FIPE is strictly less
 * than `currentYear`. FIPE "zero km" entries ("32000-N") are excluded.
 *
 * @param years        Array of FipeYear objects already fetched from the API
 * @param currentYear  Calendar year to compare against (defaults to today's year)
 */
export function isDiscontinuedFromYears(
  years: { codigo: string }[],
  currentYear = new Date().getFullYear(),
): boolean {
  // Year codes follow "YYYY-N"; only consider 4-digit calendar years (1900–9999)
  // to exclude FIPE's special-purpose entries like "32000-1" (zero km listings).
  const modelYears = years
    .map((y) => parseInt(y.codigo.split('-')[0], 10))
    .filter((y) => y >= 1900 && y <= 9999)
  if (modelYears.length === 0) return false
  return Math.max(...modelYears) < currentYear
}

/**
 * Queries the FIPE API to determine whether a vehicle model is discontinued.
 * Prefer `isDiscontinuedFromYears` when the years list is already in cache.
 *
 * @param makeId       FIPE make identifier (e.g. "39" for Mercedes-Benz)
 * @param modelId      FIPE model identifier
 * @param currentYear  Calendar year to compare against (defaults to today's year)
 */
export async function checkModelDiscontinued(
  makeId: string,
  modelId: number,
  currentYear = new Date().getFullYear(),
): Promise<boolean> {
  const years = await getYears(makeId, modelId)
  return isDiscontinuedFromYears(years, currentYear)
}

/**
 * Full async pipeline: resolves discontinuation via the FIPE API, then computes
 * the annual premium. This is the primary entry point for runtime use.
 *
 * Prefer `computeInsuranceRate` directly in unit tests or when FIPE data is
 * already available to avoid redundant network calls.
 *
 * @param fipeValue   Current FIPE market value in R$
 * @param fuelType    Vehicle fuel type from the store
 * @param makeName    Manufacturer name
 * @param yearId      FIPE year identifier, e.g. "2021-6"
 * @param makeId      FIPE make identifier (for the discontinuation check)
 * @param modelId     FIPE model identifier (for the discontinuation check)
 * @param currentYear Reference year for age and discontinuation checks (defaults to today)
 */
export async function computeInsurancePremium({
  fipeValue,
  fuelType,
  makeName,
  yearId,
  makeId,
  modelId,
  currentYear = new Date().getFullYear(),
}: {
  fipeValue: number
  fuelType: FuelType
  makeName: string
  yearId: string
  makeId: string
  modelId: number
  currentYear?: number
}): Promise<InsuranceRateResult> {
  const isDiscontinued = await checkModelDiscontinued(makeId, modelId, currentYear)
  return computeInsuranceRate({ fipeValue, fuelType, makeName, yearId, isDiscontinued, currentYear })
}
