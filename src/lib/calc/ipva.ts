export function computeAnnualIpva(vehicleValue: number, ratePct: number): number {
  return vehicleValue * (ratePct / 100)
}
