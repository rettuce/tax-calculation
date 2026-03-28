import { taxRates2025 } from '~/config/tax-rates/2025'
import { roundTaxAmount } from '~/utils/rounding'

const {
  basicDeductionBrackets,
  residentTax,
  lifeInsuranceResidentMaxTotal,
  medicalExpenseThreshold,
  medicalExpenseMaxDeduction,
} = taxRates2025

/** 住民税で考慮する各種控除（社会保険料以外） */
export interface ResidentTaxDeductionOptions {
  /** 生命保険料（支払額。住民税上限7万が適用される） */
  lifeInsurance?: number
  /** 医療費（支払総額。10万円超の部分が控除対象） */
  medicalExpense?: number
}

/**
 * 住民税の控除合計を計算する
 *
 * 所得税との主な違い:
 * - 基礎控除は大半の所得水準で43万（所得税は6段階）
 * - 生命保険料控除の上限は7万（所得税は12万）
 *
 * @param employmentIncome 給与所得（給与収入 - 給与所得控除）
 * @param deductions 各種控除オプション
 * @param socialInsurancePremium 社会保険料（全額控除）
 */
export function calculateResidentTaxDeductions(
  employmentIncome: number,
  deductions: ResidentTaxDeductionOptions,
  socialInsurancePremium: number,
): number {
  let total = 0

  // 基礎控除（住民税用）
  const basicBracket = basicDeductionBrackets.find(
    (b) => employmentIncome <= b.maxIncome,
  )
  const basicDeduction = basicBracket?.residentTaxDeduction ?? 0
  total += basicDeduction

  // 社会保険料控除（全額）
  total += socialInsurancePremium

  // 生命保険料控除（住民税上限7万）
  if (deductions.lifeInsurance && deductions.lifeInsurance > 0) {
    total += Math.min(deductions.lifeInsurance, lifeInsuranceResidentMaxTotal)
  }

  // 医療費控除（10万超の部分、上限200万）
  if (deductions.medicalExpense && deductions.medicalExpense > medicalExpenseThreshold) {
    const medicalDeduction = Math.min(
      deductions.medicalExpense - medicalExpenseThreshold,
      medicalExpenseMaxDeduction,
    )
    total += medicalDeduction
  }

  return total
}

/**
 * 調整控除を計算する
 *
 * 住民税と所得税で人的控除額に差があるため、その差額分を住民税から控除する仕組み。
 *
 * @param taxableIncome 住民税の課税所得（1,000円未満切捨て済み）
 * @param totalIncome 合計所得金額（2,500万超は適用なし）
 * @param personalDeductionDifference 人的控除差額合計（基礎控除差額50,000 + 配偶者/扶養控除差額）
 */
export function calculateAdjustmentDeduction(
  taxableIncome: number,
  totalIncome: number,
  personalDeductionDifference: number,
): number {
  if (totalIncome > 25_000_000) {
    return 0
  }

  if (taxableIncome <= 2_000_000) {
    return Math.min(personalDeductionDifference, taxableIncome) * 0.05
  }

  // 課税所得200万超
  const adjusted = Math.max(
    personalDeductionDifference - (taxableIncome - 2_000_000),
    2_500,
  )
  return adjusted * 0.05
}

/** 住民税計算結果 */
export interface ResidentTaxResult {
  /** 所得割額（100円未満切捨て） */
  incomeRate: number
  /** 均等割額（特別区民税3,000 + 都民税1,000 + 森林環境税1,000） */
  perCapita: number
  /** 合計 */
  total: number
}

/**
 * 住民税を計算する
 *
 * 所得割 = roundTaxAmount(課税所得 × 10% - 調整控除)
 * 均等割 = 5,000円（東京都特別区の場合）
 *
 * @param taxableIncome 住民税の課税所得（1,000円未満切捨て済み）
 * @param adjustmentDeduction 調整控除額
 */
export function calculateResidentTax(
  taxableIncome: number,
  adjustmentDeduction: number,
): ResidentTaxResult {
  const rawIncomeRate = taxableIncome * residentTax.totalRate - adjustmentDeduction
  const incomeRate = roundTaxAmount(rawIncomeRate)
  const perCapita = residentTax.perCapitaTotal

  return {
    incomeRate,
    perCapita,
    total: incomeRate + perCapita,
  }
}
