import { describe, it, expect } from 'vitest'
import {
  projectVehicleValue,
  vehicleAgeFromYearId,
  getDepreciationCurve,
} from './depreciation'
import { computeAnnualIpva } from './ipva'
import { computeAnnualFuel } from './fuel'
import { computeScenario } from './scenario'
import type { Scenario, OwnedVehicle, NewPurchase, FipeRef } from '@/store/types'

// All scenario tests pass referenceYear=2026 so expected values are deterministic.
// yearId '2025-1' → model year 2025 → age 1 in 2026.
const REF_YEAR = 2026

// ── helpers ──────────────────────────────────────────────────────────────────

function makeFipe(overrides: Partial<FipeRef> = {}): FipeRef {
  return {
    makeId: '1',
    makeName: 'Mercedes',
    modelId: 100,
    modelName: 'C200',
    yearId: '2025-1',
    yearName: '2025 Gasolina',
    currentValue: 280_000,
    fuelType: 'gasoline',
    fipeCode: '001001-1',
    ...overrides,
  }
}

function makeOwned(overrides: Partial<OwnedVehicle> = {}): OwnedVehicle {
  return {
    id: 'v1',
    fipe: makeFipe(),
    decision: 'keep',
    annualInsurance: 8_000,
    annualMaintenance: 4_000,
    annualKm: 15_000,
    fuelPricePerLiter: 6.0,
    kmPerLiter: 12,
    ...overrides,
  }
}

function makePurchase(overrides: Partial<NewPurchase> = {}): NewPurchase {
  return {
    id: 'p1',
    fipe: makeFipe({ currentValue: 200_000 }),
    condition: 'new',
    acquisitionCost: 200_000,
    annualInsurance: 10_000,
    annualMaintenance: 3_000,
    annualKm: 15_000,
    fuelPricePerLiter: 6.0,
    kmPerLiter: 12,
    ...overrides,
  }
}

function baseScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    ownedVehicles: [],
    newPurchases: [],
    timelineYears: 3,
    ipvaRatePct: 2,
    ...overrides,
  }
}

// ── vehicleAgeFromYearId ──────────────────────────────────────────────────────

describe('vehicleAgeFromYearId', () => {
  it('returns 0 for a same-year model', () => {
    expect(vehicleAgeFromYearId('2026-1', 2026)).toBe(0)
  })

  it('returns correct age for older models', () => {
    expect(vehicleAgeFromYearId('2024-1', 2026)).toBe(2)
    expect(vehicleAgeFromYearId('2020-3', 2026)).toBe(6)
  })

  it('clamps to 0 for future model years', () => {
    expect(vehicleAgeFromYearId('2028-1', 2026)).toBe(0)
  })
})

// ── getDepreciationCurve ──────────────────────────────────────────────────────

describe('getDepreciationCurve', () => {
  it('returns ev for electric fuel type', () => {
    expect(getDepreciationCurve('electric')).toBe('ev')
  })

  it('returns ev when isPremium flag is set', () => {
    expect(getDepreciationCurve('gasoline', true)).toBe('ev')
  })

  it('returns ice for all non-electric fuel types by default', () => {
    expect(getDepreciationCurve('gasoline')).toBe('ice')
    expect(getDepreciationCurve('ethanol')).toBe('ice')
    expect(getDepreciationCurve('diesel')).toBe('ice')
    expect(getDepreciationCurve('flex')).toBe('ice')
    expect(getDepreciationCurve('hybrid')).toBe('ice')
  })
})

// ── projectVehicleValue ───────────────────────────────────────────────────────

describe('projectVehicleValue', () => {
  it('returns currentValue unchanged at year 0 for any curve', () => {
    expect(projectVehicleValue(100_000, 0, 0, 'ice')).toBe(100_000)
    expect(projectVehicleValue(100_000, 3, 0, 'ev')).toBe(100_000)
  })

  describe('ICE curve – step-down rates from age 0', () => {
    // age 0 → turns 1: −18 %
    it('year 1 applies 18% (age 1)', () => {
      expect(projectVehicleValue(100_000, 0, 1, 'ice')).toBeCloseTo(82_000)
    })
    // age 0 → turns 2: −12 %
    it('year 2 applies 12% on remainder (age 2)', () => {
      expect(projectVehicleValue(100_000, 0, 2, 'ice')).toBeCloseTo(72_160) // 82_000 × 0.88
    })
    // age 0 → turns 3: −10 %
    it('year 3 applies 10% on remainder (age 3)', () => {
      expect(projectVehicleValue(100_000, 0, 3, 'ice')).toBeCloseTo(64_944) // 72_160 × 0.90
    })
    // ages 4-6 → −8 % per year
    it('years 4-6 apply 8% per year', () => {
      const y3 = projectVehicleValue(100_000, 0, 3, 'ice')
      const y4 = projectVehicleValue(100_000, 0, 4, 'ice')
      expect(y4).toBeCloseTo(y3 * 0.92)
    })
    // age 7+ → tail rate 4 %
    it('age 7+ applies tail rate of 4%', () => {
      expect(projectVehicleValue(100_000, 6, 1, 'ice')).toBeCloseTo(96_000) // age 7: −4%
      expect(projectVehicleValue(100_000, 10, 1, 'ice')).toBeCloseTo(96_000) // age 11: −4%
    })
  })

  describe('EV curve – step-down rates from age 0', () => {
    // age 0 → turns 1: −25 %
    it('year 1 applies 25% (age 1)', () => {
      expect(projectVehicleValue(100_000, 0, 1, 'ev')).toBeCloseTo(75_000)
    })
    // age 0 → turns 2: −15 %
    it('year 2 applies 15% on remainder (age 2)', () => {
      expect(projectVehicleValue(100_000, 0, 2, 'ev')).toBeCloseTo(63_750) // 75_000 × 0.85
    })
    // age 0 → turns 3: −12 %
    it('year 3 applies 12% on remainder (age 3)', () => {
      expect(projectVehicleValue(100_000, 0, 3, 'ev')).toBeCloseTo(56_100) // 63_750 × 0.88
    })
    // age 7+ → tail rate 5 %
    it('age 7+ applies tail rate of 5%', () => {
      expect(projectVehicleValue(100_000, 6, 1, 'ev')).toBeCloseTo(95_000) // age 7: −5%
    })
  })

  it('a newer vehicle (lower age) loses more value than an older one from the same base', () => {
    // Age 0, year 1 → rate 18 % → 82 000
    // Age 3, year 1 → rate 8 %  → 92 000
    expect(projectVehicleValue(100_000, 0, 1, 'ice'))
      .toBeLessThan(projectVehicleValue(100_000, 3, 1, 'ice'))
  })

  it('EV depreciates faster than ICE in early years from the same starting age', () => {
    expect(projectVehicleValue(100_000, 0, 1, 'ev'))
      .toBeLessThan(projectVehicleValue(100_000, 0, 1, 'ice'))
  })

  it('the depreciation curve flattens: annual loss decreases as vehicle ages', () => {
    // For a vehicle starting at age 0 with ICE curve, the dollar loss each year should shrink.
    const values = [0, 1, 2, 3, 4, 5, 6, 7].map((y) =>
      projectVehicleValue(100_000, 0, y, 'ice'),
    )
    const losses = values.slice(1).map((v, i) => values[i] - v)
    // Each annual dollar loss must not exceed the previous year's loss.
    for (let i = 1; i < losses.length; i++) {
      expect(losses[i]).toBeLessThanOrEqual(losses[i - 1] + 0.01) // +0.01 for floating-point tolerance
    }
  })
})

// ── computeAnnualIpva ─────────────────────────────────────────────────────────

describe('computeAnnualIpva', () => {
  it('computes 2% of vehicle value', () => {
    expect(computeAnnualIpva(200_000, 2)).toBeCloseTo(4_000)
  })

  it('scales with rate', () => {
    expect(computeAnnualIpva(100_000, 3.5)).toBeCloseTo(3_500)
  })

  it('returns 0 for zero value', () => {
    expect(computeAnnualIpva(0, 2)).toBe(0)
  })
})

// ── computeAnnualFuel ─────────────────────────────────────────────────────────

describe('computeAnnualFuel', () => {
  it('computes gasoline cost: (km/kmPerL) * price', () => {
    // 15000 km / 12 km/L = 1250 L × R$6 = R$7500
    expect(computeAnnualFuel(15_000, 12, 6.0, 'gasoline')).toBeCloseTo(7_500)
  })

  it('computes electric cost: (km/100) * kWh/100km * R$/kWh', () => {
    // 15000 km / 100 * 20 kWh/100km * R$0.80/kWh = 150 * 20 * 0.80 = R$2400
    expect(computeAnnualFuel(15_000, 20, 0.80, 'electric')).toBeCloseTo(2_400)
  })

  it('returns 0 when km is 0', () => {
    expect(computeAnnualFuel(0, 12, 6.0, 'gasoline')).toBe(0)
  })

  it('returns 0 when kmPerLiter is 0', () => {
    expect(computeAnnualFuel(15_000, 0, 6.0, 'gasoline')).toBe(0)
  })

  it('treats ethanol the same as gasoline formula', () => {
    // 10000 / 10 * 5 = R$5000
    expect(computeAnnualFuel(10_000, 10, 5.0, 'ethanol')).toBeCloseTo(5_000)
  })
})

// ── computeScenario ───────────────────────────────────────────────────────────

describe('computeScenario', () => {
  it('empty scenario yields all zeros', () => {
    const result = computeScenario(baseScenario(), REF_YEAR)
    expect(result.cashInHand).toBe(0)
    result.byYear.forEach((y) => {
      expect(y.assetEquity).toBe(0)
      expect(y.annualTco).toBe(0)
      expect(y.cumulativeTco).toBe(0)
      expect(y.totalPortfolio).toBe(0)
    })
  })

  it('sell both, buy nothing → TCO ≈ 0, portfolio ≈ sale proceeds', () => {
    const v1 = makeOwned({ id: 'v1', decision: 'sell', salePrice: 280_000, fipe: makeFipe({ currentValue: 280_000 }) })
    const v2 = makeOwned({ id: 'v2', decision: 'sell', salePrice: 180_000, fipe: makeFipe({ currentValue: 180_000 }) })
    const result = computeScenario(baseScenario({ ownedVehicles: [v1, v2], timelineYears: 3 }), REF_YEAR)

    expect(result.cashInHand).toBeCloseTo(460_000)
    result.byYear.forEach((y) => {
      expect(y.assetEquity).toBe(0)
      expect(y.annualTco).toBe(0)
      expect(y.totalPortfolio).toBeCloseTo(460_000)
    })
  })

  it('sell with percentage discount reduces cash in hand', () => {
    const v = makeOwned({ decision: 'sell', salePrice: undefined, discountPct: 10, fipe: makeFipe({ currentValue: 100_000 }) })
    const result = computeScenario(baseScenario({ ownedVehicles: [v] }), REF_YEAR)
    // 100_000 * (1 - 0.10) = 90_000
    expect(result.cashInHand).toBeCloseTo(90_000)
  })

  it('year 0 has no TCO costs', () => {
    const v = makeOwned()
    const result = computeScenario(baseScenario({ ownedVehicles: [v] }), REF_YEAR)
    expect(result.byYear[0].annualTco).toBe(0)
    expect(result.byYear[0].cumulativeTco).toBe(0)
  })

  it('IPVA accumulates across years for a kept vehicle (yearId 2025-1 → age 1 in 2026)', () => {
    // yearId '2025-1' with REF_YEAR=2026 → vehicleAge=1
    // Year 1 of sim: vehicle turns age 2 → ICE rate 12% → value = 100_000 × 0.88 = 88_000
    // Year 2 of sim: vehicle turns age 3 → ICE rate 10% → value = 88_000 × 0.90 = 79_200
    const v = makeOwned({
      fipe: makeFipe({ currentValue: 100_000, yearId: '2025-1' }),
      annualInsurance: 0,
      annualMaintenance: 0,
      annualKm: 0,
      kmPerLiter: 12,
      fuelPricePerLiter: 0,
    })
    const result = computeScenario(baseScenario({ ownedVehicles: [v], timelineYears: 2, ipvaRatePct: 2 }), REF_YEAR)
    expect(result.byYear[1].tcoBreakdown.ipva).toBeCloseTo(1_760)  // 88_000 × 0.02
    expect(result.byYear[2].tcoBreakdown.ipva).toBeCloseTo(1_584)  // 79_200 × 0.02
    expect(result.byYear[2].cumulativeTco).toBeCloseTo(3_344)
  })

  it('new purchase year-0 equity = acquisitionCost', () => {
    const p = makePurchase({ acquisitionCost: 200_000 })
    const result = computeScenario(baseScenario({ newPurchases: [p] }), REF_YEAR)
    expect(result.byYear[0].assetEquity).toBeCloseTo(200_000)
  })

  it('new purchase (condition=new) depreciates from age 0 with ICE curve', () => {
    // condition='new' forces vehicleAge=0 regardless of yearId
    // Year 1: age 1 → ICE rate 18% → 100_000 × 0.82 = 82_000
    // Year 2: age 2 → ICE rate 12% → 82_000 × 0.88 = 72_160
    const p = makePurchase({ fipe: makeFipe({ currentValue: 100_000 }), acquisitionCost: 100_000, condition: 'new' })
    const result = computeScenario(baseScenario({ newPurchases: [p], timelineYears: 2 }), REF_YEAR)
    expect(result.byYear[1].assetEquity).toBeCloseTo(82_000)
    expect(result.byYear[2].assetEquity).toBeCloseTo(72_160)
  })

  it('byYear length = timelineYears + 1', () => {
    const result = computeScenario(baseScenario({ timelineYears: 5 }), REF_YEAR)
    expect(result.byYear).toHaveLength(6)
  })

  it('full realistic fixture: Mercedes C200 kept, Volvo sold, EV purchased', () => {
    // Mercedes: gasoline, yearId '2025-1' → age 1 in 2026, ICE curve
    // EV: condition='new' → age 0, EV curve
    const mercedes = makeOwned({
      id: 'c200',
      fipe: makeFipe({ currentValue: 280_000, fuelType: 'gasoline', yearId: '2025-1' }),
      decision: 'keep',
      annualInsurance: 8_000,
      annualMaintenance: 4_000,
      annualKm: 15_000,
      fuelPricePerLiter: 6.0,
      kmPerLiter: 12,
    })
    const volvo = makeOwned({
      id: 'xc40',
      fipe: makeFipe({ currentValue: 180_000 }),
      decision: 'sell',
      salePrice: 170_000,
    })
    const ev = makePurchase({
      id: 'ev1',
      fipe: makeFipe({ currentValue: 250_000, fuelType: 'electric' }),
      condition: 'new',
      acquisitionCost: 240_000,
      annualInsurance: 12_000,
      annualMaintenance: 2_000,
      annualKm: 15_000,
      fuelPricePerLiter: 0.80,
      kmPerLiter: 20,  // kWh/100km
    })

    const result = computeScenario(
      baseScenario({ ownedVehicles: [mercedes, volvo], newPurchases: [ev], timelineYears: 3, ipvaRatePct: 2 }),
      REF_YEAR,
    )

    // cashInHand = 170_000 - 240_000 = -70_000
    expect(result.cashInHand).toBeCloseTo(-70_000)

    // year 0 equity: mercedes(280_000) + ev at acquisitionCost(240_000) = 520_000
    expect(result.byYear[0].assetEquity).toBeCloseTo(520_000)
    expect(result.byYear[0].totalPortfolio).toBeCloseTo(450_000)  // -70_000 + 520_000

    // year 0 no TCO
    expect(result.byYear[0].annualTco).toBe(0)

    // year 1 annual costs should be positive
    expect(result.byYear[1].annualTco).toBeGreaterThan(0)

    // cumulative TCO grows monotonically
    for (let i = 1; i <= 3; i++) {
      expect(result.byYear[i].cumulativeTco).toBeGreaterThan(result.byYear[i - 1].cumulativeTco)
    }

    // assets depreciate over time
    expect(result.byYear[3].assetEquity).toBeLessThan(result.byYear[0].assetEquity)
  })
})
