export type FuelType = 'gasoline' | 'ethanol' | 'diesel' | 'flex' | 'electric' | 'hybrid'

export type FipeRef = {
  makeId: string
  makeName: string
  modelId: number
  modelName: string
  yearId: string
  yearName: string
  currentValue: number
  fuelType: FuelType
  fipeCode: string
}

export type OwnedVehicle = {
  id: string
  fipe: FipeRef
  decision: 'keep' | 'sell'
  salePrice?: number
  discountPct?: number
  annualInsurance: number
  annualMaintenance: number
  annualKm: number
  fuelPricePerLiter: number
  kmPerLiter: number
}

export type NewPurchase = {
  id: string
  fipe: FipeRef
  condition: 'new' | 'used'
  acquisitionCost: number
  annualInsurance: number
  annualMaintenance: number
  annualKm: number
  fuelPricePerLiter: number
  kmPerLiter: number
}

export type Scenario = {
  ownedVehicles: OwnedVehicle[]
  newPurchases: NewPurchase[]
  timelineYears: 1 | 2 | 3 | 4 | 5
  ipvaRatePct: number
}
