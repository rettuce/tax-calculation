import { taxRates2025 } from '~/config/tax-rates/2025'
import { roundTaxableIncome, roundTaxAmount } from '~/utils/rounding'

const { incomeTaxBrackets, employmentIncomeDeductionBrackets, reconstructionTaxRate } = taxRates2025

/**
 * 給与所得控除額を計算する
 *
 * 令和7年分改正: 最低保障額 65万円, 上限 195万円（850万超）
 */
export function calculateEmploymentIncomeDeduction(grossIncome: number): number {
  const bracket = employmentIncomeDeductionBrackets.find(
    (b) => grossIncome >= b.min && grossIncome <= b.max,
  )

  if (!bracket) {
    return 650_000
  }

  if (bracket.fixedAmount !== null) {
    return bracket.fixedAmount
  }

  return grossIncome * bracket.rate + bracket.addition
}

/**
 * 給与所得を計算する
 *
 * = 給与収入 - 給与所得控除（0未満は0）
 */
export function calculateEmploymentIncome(grossIncome: number): number {
  return Math.max(0, grossIncome - calculateEmploymentIncomeDeduction(grossIncome))
}

/**
 * 所得税を計算する（速算表方式）
 *
 * 入力の課税所得に対して roundTaxableIncome（1,000円未満切捨て）を適用してから
 * 該当ブラケットの税率・控除額で計算する
 */
export function calculateIncomeTax(taxableIncome: number): number {
  const rounded = roundTaxableIncome(taxableIncome)

  if (rounded <= 0) {
    return 0
  }

  const bracket = incomeTaxBrackets.find(
    (b) => rounded >= b.min && rounded <= b.max,
  )

  if (!bracket) {
    return 0
  }

  return rounded * bracket.rate - bracket.deduction
}

/**
 * 復興特別所得税を計算する
 *
 * = Math.floor(所得税額 × 2.1%)
 */
export function calculateReconstructionTax(incomeTax: number): number {
  return Math.floor(incomeTax * reconstructionTaxRate)
}

/**
 * 所得税 + 復興特別所得税の合計を計算する
 *
 * 合計額に対して roundTaxAmount（100円未満切捨て）を適用
 */
export function calculateTotalIncomeTax(taxableIncome: number): number {
  const incomeTax = calculateIncomeTax(taxableIncome)
  const reconstruction = calculateReconstructionTax(incomeTax)
  return roundTaxAmount(incomeTax + reconstruction)
}
