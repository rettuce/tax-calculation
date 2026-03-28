/**
 * 控除計算ユーティリティ
 *
 * 所得税と住民税で控除額が異なるため、両方を別々に計算する。
 * 特に基礎控除（6段階）と生命保険料控除は金額差が大きい。
 *
 * 出典:
 * - 国税庁 No.1199 基礎控除 (令和7年)
 * - 国税庁 No.1191 配偶者控除 / No.1195 配偶者特別控除
 * - 国税庁 No.1180 扶養控除
 * - 国税庁 No.1411 所得金額調整控除
 * - 国税庁 No.1140 生命保険料控除
 */

import { taxRates2025 } from '~/config/tax-rates/2025'
import type { DependentType } from '~/config/tax-rates/types'

const {
  basicDeductionBrackets,
  spouseDeduction,
  spouseSpecialDeduction,
  dependentDeductions,
  lifeInsuranceMaxTotal,
  lifeInsuranceResidentMaxTotal,
} = taxRates2025

export type TaxType = 'incomeTax' | 'residentTax'

/** 扶養親族の入力 */
export interface DependentInput {
  type: DependentType
  count: number
}

/** 控除額の内訳 */
interface DeductionBreakdownItem {
  incomeTax: number
  residentTax: number
}

/** calculateAllDeductions の入力 */
export interface AllDeductionsInput {
  /** 合計所得金額（基礎控除・配偶者控除の判定に使用） */
  totalIncome: number
  /** 給与収入（所得金額調整控除の判定に使用） */
  grossIncome: number
  /** 23歳未満の扶養親族 or 特別障害者の有無 */
  hasYoungDependent: boolean
  /** 配偶者の合計所得金額（undefined = 配偶者なし） */
  spouseIncome?: number
  /** 扶養親族の入力 */
  dependents?: DependentInput[]
  /** 生命保険料の合計支払額 */
  lifeInsurancePremium?: number
}

/** calculateAllDeductions の戻り値 */
export interface AllDeductionsResult {
  incomeTaxTotal: number
  residentTaxTotal: number
  breakdown: {
    basic: DeductionBreakdownItem
    spouse: DeductionBreakdownItem
    dependent: DeductionBreakdownItem
    incomeAdjustment: DeductionBreakdownItem
    lifeInsurance: DeductionBreakdownItem
  }
}

// =============================================================================
// 基礎控除
// =============================================================================

/**
 * 基礎控除を取得する
 *
 * 令和7年改正により所得税の基礎控除は6段階。
 * 住民税は2400万以下で43万、以降段階的に減少。
 * 合計所得2500万超は所得税・住民税ともに0。
 */
export function getBasicDeduction(totalIncome: number, taxType: TaxType): number {
  if (totalIncome > 25_000_000) {
    return 0
  }

  const bracket = basicDeductionBrackets.find((b) => totalIncome <= b.maxIncome)

  if (!bracket) {
    return 0
  }

  return taxType === 'incomeTax'
    ? bracket.incomeTaxDeduction
    : bracket.residentTaxDeduction
}

// =============================================================================
// 配偶者控除・配偶者特別控除
// =============================================================================

/**
 * 本人の所得区分インデックスを取得する（配偶者特別控除テーブル用）
 *
 * 0: 900万以下, 1: 950万以下, 2: 1000万以下
 */
function getOwnerIncomeIndex(ownerIncome: number): number {
  if (ownerIncome <= 9_000_000) return 0
  if (ownerIncome <= 9_500_000) return 1
  return 2
}

/**
 * 配偶者控除・配偶者特別控除を計算する
 *
 * - 本人所得1000万超: 0
 * - 配偶者所得58万以下: 配偶者控除テーブル適用
 * - 配偶者所得58万超〜133万以下: 配偶者特別控除テーブル適用
 * - 配偶者所得133万超: 0
 */
export function calculateSpouseDeduction(
  ownerIncome: number,
  spouseIncome: number,
  taxType: TaxType,
): number {
  if (ownerIncome > 10_000_000) {
    return 0
  }

  // 配偶者控除（配偶者所得58万以下）
  if (spouseIncome <= 580_000) {
    const entry = spouseDeduction.find((e) => ownerIncome <= e.maxOwnerIncome)
    if (!entry) return 0

    return taxType === 'incomeTax'
      ? entry.incomeTaxGeneral
      : entry.residentTaxGeneral
  }

  // 配偶者特別控除（配偶者所得58万超〜133万以下）
  if (spouseIncome > 1_330_000) {
    return 0
  }

  const specialEntry = spouseSpecialDeduction.find(
    (e) => spouseIncome > e.minSpouseIncome && spouseIncome <= e.maxSpouseIncome,
  )
  if (!specialEntry) return 0

  const ownerIndex = getOwnerIncomeIndex(ownerIncome)
  return taxType === 'incomeTax'
    ? specialEntry.incomeTax[ownerIndex]
    : specialEntry.residentTax[ownerIndex]
}

// =============================================================================
// 扶養控除
// =============================================================================

/**
 * 扶養控除を計算する
 *
 * 各種別ごとの人数 x 控除額を合算する。
 */
export function calculateDependentDeduction(
  dependents: DependentInput[],
  taxType: TaxType,
): number {
  return dependents.reduce((sum, input) => {
    const entry = dependentDeductions.find((d) => d.type === input.type)
    if (!entry) return sum

    const amount = taxType === 'incomeTax'
      ? entry.incomeTaxDeduction
      : entry.residentTaxDeduction

    return sum + amount * input.count
  }, 0)
}

// =============================================================================
// 所得金額調整控除
// =============================================================================

const INCOME_ADJUSTMENT_THRESHOLD = 8_500_000
const INCOME_ADJUSTMENT_RATE = 0.10
const INCOME_ADJUSTMENT_MAX = 150_000

/**
 * 所得金額調整控除を計算する（所得税のみ）
 *
 * 給与収入850万超 かつ 23歳未満扶養親族あり（or 特別障害者）の場合:
 * (給与収入 - 850万) x 10% （上限15万）
 */
export function calculateIncomeAdjustmentDeduction(
  grossIncome: number,
  hasYoungDependent: boolean,
): number {
  if (grossIncome <= INCOME_ADJUSTMENT_THRESHOLD || !hasYoungDependent) {
    return 0
  }

  const amount = (grossIncome - INCOME_ADJUSTMENT_THRESHOLD) * INCOME_ADJUSTMENT_RATE
  return Math.min(amount, INCOME_ADJUSTMENT_MAX)
}

// =============================================================================
// 生命保険料控除
// =============================================================================

/**
 * 生命保険料控除を計算する（簡易版）
 *
 * 合計保険料を受け取り、税種別の上限でキャップする。
 * - 所得税: 上限12万（各区分4万 x 3）
 * - 住民税: 上限7万（各区分2.8万 x 3、合計上限7万）
 */
export function calculateLifeInsuranceDeduction(
  premiums: number,
  taxType: TaxType,
): number {
  const maxAmount = taxType === 'incomeTax'
    ? lifeInsuranceMaxTotal
    : lifeInsuranceResidentMaxTotal

  return Math.min(premiums, maxAmount)
}

// =============================================================================
// 控除合計
// =============================================================================

/**
 * 全控除を一括計算する
 *
 * 所得税と住民税で控除額が異なるため、両方の合計を別々に返す。
 */
export function calculateAllDeductions(input: AllDeductionsInput): AllDeductionsResult {
  const {
    totalIncome,
    grossIncome,
    hasYoungDependent,
    spouseIncome,
    dependents = [],
    lifeInsurancePremium = 0,
  } = input

  const basic: DeductionBreakdownItem = {
    incomeTax: getBasicDeduction(totalIncome, 'incomeTax'),
    residentTax: getBasicDeduction(totalIncome, 'residentTax'),
  }

  const spouse: DeductionBreakdownItem = spouseIncome !== undefined
    ? {
        incomeTax: calculateSpouseDeduction(totalIncome, spouseIncome, 'incomeTax'),
        residentTax: calculateSpouseDeduction(totalIncome, spouseIncome, 'residentTax'),
      }
    : { incomeTax: 0, residentTax: 0 }

  const dependent: DeductionBreakdownItem = {
    incomeTax: calculateDependentDeduction(dependents, 'incomeTax'),
    residentTax: calculateDependentDeduction(dependents, 'residentTax'),
  }

  const incomeAdjustment: DeductionBreakdownItem = {
    incomeTax: calculateIncomeAdjustmentDeduction(grossIncome, hasYoungDependent),
    residentTax: 0, // 所得金額調整控除は所得税のみ
  }

  const lifeInsurance: DeductionBreakdownItem = {
    incomeTax: calculateLifeInsuranceDeduction(lifeInsurancePremium, 'incomeTax'),
    residentTax: calculateLifeInsuranceDeduction(lifeInsurancePremium, 'residentTax'),
  }

  const incomeTaxTotal =
    basic.incomeTax +
    spouse.incomeTax +
    dependent.incomeTax +
    incomeAdjustment.incomeTax +
    lifeInsurance.incomeTax

  const residentTaxTotal =
    basic.residentTax +
    spouse.residentTax +
    dependent.residentTax +
    incomeAdjustment.residentTax +
    lifeInsurance.residentTax

  return {
    incomeTaxTotal,
    residentTaxTotal,
    breakdown: {
      basic,
      spouse,
      dependent,
      incomeAdjustment,
      lifeInsurance,
    },
  }
}
