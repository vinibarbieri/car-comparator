import type { Scenario, OwnedVehicle, NewPurchase } from '@/store/types'
import { projectVehicleValue, vehicleAgeFromYearId, getDepreciationCurve, type DepreciationCurve } from './depreciation'
import { computeAnnualIpva } from './ipva'
import { computeAnnualFuel } from './fuel'

export type TcoBreakdown = {
  ipva: number
  insurance: number
  maintenance: number
  fuel: number
}

export type YearlyMetrics = {
  year: number
  assetEquity: number
  annualTco: number
  cumulativeTco: number
  totalPortfolio: number
  tcoBreakdown: TcoBreakdown
}

export type ScenarioResult = {
  cashInHand: number
  byYear: YearlyMetrics[]  // length = timelineYears + 1 (year 0 through timelineYears)
}

// Pre-computed, static data per vehicle that does not change across simulation years.
type KeptEntry = { v: OwnedVehicle; age: number; curve: DepreciationCurve }
type PurchaseEntry = { p: NewPurchase; age: number; curve: DepreciationCurve }

function effectiveSalePrice(v: OwnedVehicle): number {
  if (v.salePrice !== undefined) return v.salePrice
  return v.fipe.currentValue * (1 - (v.discountPct ?? 0) / 100)
}

/**
 * Runs the full financial simulation for a scenario over its configured timeline.
 *
 * @param scenario       The scenario to evaluate
 * @param referenceYear  Calendar year used to determine vehicle ages (defaults to today).
 *                       Pass an explicit value in tests to keep results deterministic.
 * @returns              Cash-in-hand balance and per-year metrics (index 0 = today)
 */
export function computeScenario(
  scenario: Scenario,
  referenceYear = new Date().getFullYear(),
): ScenarioResult {
  const { ownedVehicles, newPurchases, timelineYears, ipvaRatePct } = scenario

  const soldVehicles = ownedVehicles.filter((v) => v.decision === 'sell')
  const keptVehicles = ownedVehicles.filter((v) => v.decision === 'keep')

  const saleProceeds = soldVehicles.reduce((sum, v) => sum + effectiveSalePrice(v), 0)
  const purchaseCosts = newPurchases.reduce((sum, p) => sum + p.acquisitionCost, 0)
  const cashInHand = saleProceeds - purchaseCosts

  // Resolve depreciation parameters once per vehicle — they are constant across years.
  const keptEntries: KeptEntry[] = keptVehicles.map((v) => ({
    v,
    age: vehicleAgeFromYearId(v.fipe.yearId, referenceYear),
    curve: getDepreciationCurve(v.fipe.fuelType),
  }))

  const purchaseEntries: PurchaseEntry[] = newPurchases.map((p) => ({
    p,
    // New-condition purchases start at age 0 regardless of the yearId on the FIPE record.
    // Used purchases carry their real model age.
    age: p.condition === 'new' ? 0 : vehicleAgeFromYearId(p.fipe.yearId, referenceYear),
    curve: getDepreciationCurve(p.fipe.fuelType),
  }))

  const byYear: YearlyMetrics[] = []
  let cumulativeTco = 0

  for (let year = 0; year <= timelineYears; year++) {
    let assetEquity = 0
    let ipvaTotal = 0
    let insuranceTotal = 0
    let maintenanceTotal = 0
    let fuelTotal = 0

    for (const { v, age, curve } of keptEntries) {
      const value = projectVehicleValue(v.fipe.currentValue, age, year, curve)
      assetEquity += value
      if (year >= 1) {
        ipvaTotal += computeAnnualIpva(value, ipvaRatePct)
        insuranceTotal += v.annualInsurance
        maintenanceTotal += v.annualMaintenance
        fuelTotal += computeAnnualFuel(v.annualKm, v.kmPerLiter, v.fuelPricePerLiter, v.fipe.fuelType)
      }
    }

    for (const { p, age, curve } of purchaseEntries) {
      // Year-0 equity uses the negotiated acquisition cost, not the FIPE projection,
      // because the car was just purchased at that price.
      const value = year === 0
        ? p.acquisitionCost
        : projectVehicleValue(p.fipe.currentValue, age, year, curve)
      assetEquity += value
      if (year >= 1) {
        ipvaTotal += computeAnnualIpva(value, ipvaRatePct)
        insuranceTotal += p.annualInsurance
        maintenanceTotal += p.annualMaintenance
        fuelTotal += computeAnnualFuel(p.annualKm, p.kmPerLiter, p.fuelPricePerLiter, p.fipe.fuelType)
      }
    }

    const annualTco = ipvaTotal + insuranceTotal + maintenanceTotal + fuelTotal
    cumulativeTco += annualTco

    byYear.push({
      year,
      assetEquity,
      annualTco,
      cumulativeTco,
      totalPortfolio: cashInHand + assetEquity,
      tcoBreakdown: {
        ipva: ipvaTotal,
        insurance: insuranceTotal,
        maintenance: maintenanceTotal,
        fuel: fuelTotal,
      },
    })
  }

  return { cashInHand, byYear }
}
