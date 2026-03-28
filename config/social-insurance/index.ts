export type { SocialInsuranceConfig } from './types'
export { socialInsurance2025 } from './2025'

import type { SocialInsuranceConfig } from './types'
import { socialInsurance2025 } from './2025'

export type InsuranceFiscalYear = '2025'

const registry: Record<InsuranceFiscalYear, SocialInsuranceConfig> = {
  '2025': socialInsurance2025,
}

export function getSocialInsuranceRates(year: InsuranceFiscalYear): SocialInsuranceConfig {
  return registry[year]
}
