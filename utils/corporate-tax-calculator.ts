/**
 * 法人税等計算
 *
 * 対象: 中小法人（東京都特別区）
 * 端数処理: 国税通則法第119条に基づき100円未満切捨て
 */

import { roundTaxableIncome, roundTaxAmount } from './rounding'
import { corporateTax2025 } from '~/config/corporate-tax'
import type { CorporateTaxConfig, BusinessTaxBracket } from '~/config/corporate-tax/types'

/** 法人プロフィール */
export interface CorporateProfile {
  /** 資本金 (円) */
  capital: number
  /** 従業員数 */
  employees: number
}

/** 法人税等の計算結果 */
export interface CorporateTaxResult {
  /** 課税所得（端数処理後） */
  taxableIncome: number
  /** 法人税（国税） */
  corporateTax: number
  /** 地方法人税 */
  localCorporateTax: number
  /** 法人住民税 法人税割 */
  inhabitantTax: number
  /** 法人住民税 均等割 */
  flatRate: number
  /** 法人事業税 */
  businessTax: number
  /** 特別法人事業税 */
  specialBusinessTax: number
  /** 合計税額 */
  totalTax: number
}

const CONFIG: CorporateTaxConfig = corporateTax2025

/** 超過税率が適用される資本金のしきい値 */
const CAPITAL_THRESHOLD = 100_000_000

/** 住民税の標準税率適用上限（法人税額） */
const INHABITANT_TAX_STANDARD_LIMIT = 10_000_000

/** 事業税の標準税率適用上限（所得） */
const BUSINESS_TAX_STANDARD_INCOME_LIMIT = 25_000_000

/**
 * ブラケット税率で所得に対する税額を計算する
 * 累進課税の各区間ごとに税率を適用し合算
 */
function calculateBracketTax(
  income: number,
  brackets: { maxIncome: number; rate: number }[],
): number {
  let remaining = income
  let tax = 0
  let previousMax = 0

  for (const bracket of brackets) {
    if (remaining <= 0) break
    const bracketWidth = bracket.maxIncome - previousMax
    const taxableInBracket = Math.min(remaining, bracketWidth)
    tax += taxableInBracket * bracket.rate
    remaining -= taxableInBracket
    previousMax = bracket.maxIncome
  }

  return tax
}

/**
 * 事業税ブラケットで税額を計算する
 * 標準税率/超過税率を選択
 */
function calculateBusinessTaxFromBrackets(
  income: number,
  brackets: BusinessTaxBracket[],
  useExcessRate: boolean,
): number {
  let remaining = income
  let tax = 0
  let previousMax = 0

  for (const bracket of brackets) {
    if (remaining <= 0) break
    const bracketWidth = bracket.maxIncome - previousMax
    const taxableInBracket = Math.min(remaining, bracketWidth)
    const rate = useExcessRate ? bracket.excessRate : bracket.standardRate
    tax += taxableInBracket * rate
    remaining -= taxableInBracket
    previousMax = bracket.maxIncome
  }

  return tax
}

/**
 * 法人税等を計算する
 *
 * @param taxableIncome - 課税所得（roundTaxableIncomeを内部で適用）
 * @param profile - 法人プロフィール（資本金・従業員数）
 */
export function calculateCorporateTaxes(
  taxableIncome: number,
  profile: CorporateProfile,
): CorporateTaxResult {
  const roundedIncome = roundTaxableIncome(taxableIncome)

  if (roundedIncome <= 0) {
    return {
      taxableIncome: 0,
      corporateTax: 0,
      localCorporateTax: 0,
      inhabitantTax: 0,
      flatRate: CONFIG.flatRate.annualAmount,
      businessTax: 0,
      specialBusinessTax: 0,
      totalTax: CONFIG.flatRate.annualAmount,
    }
  }

  // --- 法人税（国税） ---
  const corporateTax = roundTaxAmount(
    calculateBracketTax(roundedIncome, CONFIG.corporateTaxBrackets),
  )

  // --- 地方法人税 ---
  const localCorporateTax = roundTaxAmount(
    corporateTax * CONFIG.localCorporateTaxRate,
  )

  // --- 法人住民税 法人税割 ---
  const useExcessInhabitantRate =
    profile.capital > CAPITAL_THRESHOLD || corporateTax > INHABITANT_TAX_STANDARD_LIMIT
  const inhabitantRate = useExcessInhabitantRate
    ? CONFIG.inhabitantTax.excessRate
    : CONFIG.inhabitantTax.standardRate
  const inhabitantTax = roundTaxAmount(corporateTax * inhabitantRate)

  // --- 均等割 ---
  const flatRate = CONFIG.flatRate.annualAmount

  // --- 法人事業税 ---
  const useExcessBusinessRate =
    profile.capital > CAPITAL_THRESHOLD || roundedIncome > BUSINESS_TAX_STANDARD_INCOME_LIMIT
  const businessTax = roundTaxAmount(
    calculateBusinessTaxFromBrackets(
      roundedIncome,
      CONFIG.businessTaxBrackets,
      useExcessBusinessRate,
    ),
  )

  // --- 特別法人事業税 ---
  // 常に標準税率で計算したbase事業税を使用
  const baseBusinessTaxStandard = calculateBusinessTaxFromBrackets(
    roundedIncome,
    CONFIG.businessTaxBrackets,
    false,
  )
  const specialBusinessTax = roundTaxAmount(
    baseBusinessTaxStandard * CONFIG.specialBusinessTaxRate,
  )

  const totalTax =
    corporateTax +
    localCorporateTax +
    inhabitantTax +
    flatRate +
    businessTax +
    specialBusinessTax

  return {
    taxableIncome: roundedIncome,
    corporateTax,
    localCorporateTax,
    inhabitantTax,
    flatRate,
    businessTax,
    specialBusinessTax,
    totalTax,
  }
}

/**
 * 実効税率を計算する
 *
 * 法定実効税率の公式:
 * (法人税率 × (1 + 地方法人税率 + 住民税率) + 事業税率 × (1 + 特別法人事業税率))
 * / (1 + 事業税率 × (1 + 特別法人事業税率))
 *
 * ブラケットをまたぐ場合は加重平均税率を使用
 */
export function calculateEffectiveTaxRate(
  taxableIncome: number,
  profile: CorporateProfile,
): number {
  const roundedIncome = roundTaxableIncome(taxableIncome)
  if (roundedIncome <= 0) return 0

  // 加重平均法人税率
  const corporateTaxAmount = calculateBracketTax(
    roundedIncome,
    CONFIG.corporateTaxBrackets,
  )
  const weightedCorporateRate = corporateTaxAmount / roundedIncome

  // 住民税率の選択
  const useExcessInhabitantRate =
    profile.capital > CAPITAL_THRESHOLD ||
    roundTaxAmount(corporateTaxAmount) > INHABITANT_TAX_STANDARD_LIMIT
  const inhabitantRate = useExcessInhabitantRate
    ? CONFIG.inhabitantTax.excessRate
    : CONFIG.inhabitantTax.standardRate

  // 地方法人税率
  const localRate = CONFIG.localCorporateTaxRate

  // 加重平均事業税率（標準税率）
  const businessTaxAmount = calculateBusinessTaxFromBrackets(
    roundedIncome,
    CONFIG.businessTaxBrackets,
    false,
  )
  const weightedBusinessRate = businessTaxAmount / roundedIncome

  // 特別法人事業税率
  const specialRate = CONFIG.specialBusinessTaxRate

  // 法定実効税率
  const numerator =
    weightedCorporateRate * (1 + localRate + inhabitantRate) +
    weightedBusinessRate * (1 + specialRate)
  const denominator = 1 + weightedBusinessRate * (1 + specialRate)

  return numerator / denominator
}
