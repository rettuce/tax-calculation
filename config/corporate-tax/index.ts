export type { CorporateTaxConfig } from './types'
export { corporateTax2025 } from './2025'

import type { CorporateTaxConfig } from './types'
import { corporateTax2025 } from './2025'

export type CorporateFiscalYear = '2025'

const registry: Record<CorporateFiscalYear, CorporateTaxConfig> = {
  '2025': corporateTax2025,
}

export function getCorporateTaxRates(year: CorporateFiscalYear): CorporateTaxConfig {
  return registry[year]
}
