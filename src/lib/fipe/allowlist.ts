export const ALLOWED_MAKE_NAMES = [
  'Audi',
  'BMW',
  'BYD',
  'CAOA Chery',
  'Citroën',
  'Fiat',
  'Ford',
  'GM - Chevrolet',
  'GWM',
  'Honda',
  'Hyundai',
  'Jeep',
  'Jaecoo',
  'Kia Motors',
  'Mitsubishi',
  'Nissan',
  'Peugeot',
  'Renault',
  'Toyota',
  'Volvo',
  'VW - VolksWagen',
]

const MIN_YEAR = 2022

export function isAllowedMake(nome: string): boolean {
  return ALLOWED_MAKE_NAMES.some((n) => n.toLowerCase() === nome.toLowerCase())
}

export function isAllowedYear(codigo: string): boolean {
  const year = parseInt(codigo.split('-')[0])
  return year >= MIN_YEAR
}
