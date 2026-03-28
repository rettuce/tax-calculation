export type { TaxRateConfig } from './types'
export { taxRates2025 } from './2025'

import type { TaxRateConfig } from './types'
import { taxRates2025 } from './2025'

export type FiscalYear = '2025'

const registry: Record<FiscalYear, TaxRateConfig> = {
  '2025': taxRates2025,
}

export function getTaxRates(year: FiscalYear): TaxRateConfig {
  return registry[year]
}
