import type { FipeMake, FipeModel, FipeYear, FipeVehicle } from './types'

const BASE_URL = 'https://parallelum.com.br/fipe/api/v1/carros'

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) throw new Error(`FIPE API error: ${res.status} ${path}`)
  return res.json() as Promise<T>
}

export async function getMakes(): Promise<FipeMake[]> {
  return fetchJson<FipeMake[]>('/marcas')
}

export async function getModels(makeId: string): Promise<{ modelos: FipeModel[] }> {
  return fetchJson(`/marcas/${makeId}/modelos`)
}

export async function getYears(makeId: string, modelId: number): Promise<FipeYear[]> {
  return fetchJson(`/marcas/${makeId}/modelos/${modelId}/anos`)
}

export async function getVehicle(
  makeId: string,
  modelId: number,
  yearId: string,
): Promise<FipeVehicle> {
  return fetchJson(`/marcas/${makeId}/modelos/${modelId}/anos/${yearId}`)
}
