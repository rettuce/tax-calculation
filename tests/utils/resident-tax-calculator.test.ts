import { describe, test, expect } from 'vitest'
import {
  calculateResidentTaxDeductions,
  calculateAdjustmentDeduction,
  calculateResidentTax,
} from '~/utils/resident-tax-calculator'

describe('calculateResidentTaxDeductions', () => {
  test('基本パターン: 基礎控除43万 + 社会保険料', () => {
    // 給与所得 4,360,000 → basicDeductionBrackets で maxIncome 4,890,000 以下
    // → residentTaxDeduction = 430,000
    const result = calculateResidentTaxDeductions(4_360_000, {}, 846_300)
    expect(result).toBe(1_276_300) // 430,000 + 846,300
  })

  test('高所得: 給与所得 9,650,000 でも基礎控除43万', () => {
    // 給与所得 9,650,000 → maxIncome 23,500,000 以下 → residentTaxDeduction = 430,000
    const result = calculateResidentTaxDeductions(9_650_000, {}, 1_511_038)
    expect(result).toBe(1_941_038) // 430,000 + 1,511,038
  })

  test('合計所得2400万超〜2450万以下: 基礎控除15万', () => {
    // 24,200,000 → maxIncome 24,500,000 ブラケット → residentTaxDeduction = 150,000
    const result = calculateResidentTaxDeductions(24_200_000, {}, 500_000)
    expect(result).toBe(650_000) // 150,000 + 500,000
  })

  test('合計所得2450万超〜2500万以下: 基礎控除0', () => {
    // 24,800,000 → maxIncome 25,000,000 ブラケット → residentTaxDeduction = 0
    const result = calculateResidentTaxDeductions(24_800_000, {}, 500_000)
    expect(result).toBe(500_000) // 0 + 500,000
  })

  test('合計所得2500万超: 基礎控除なし', () => {
    const result = calculateResidentTaxDeductions(25_500_000, {}, 500_000)
    expect(result).toBe(500_000) // 0 + 500,000
  })

  test('生命保険料控除は住民税上限7万', () => {
    const result = calculateResidentTaxDeductions(
      4_360_000,
      { lifeInsurance: 100_000 },
      846_300,
    )
    // 基礎控除430,000 + 社保846,300 + 生命保険70,000（上限適用）= 1,346,300
    expect(result).toBe(1_346_300)
  })

  test('生命保険料控除が上限以下ならそのまま', () => {
    const result = calculateResidentTaxDeductions(
      4_360_000,
      { lifeInsurance: 50_000 },
      846_300,
    )
    // 基礎控除430,000 + 社保846,300 + 生命保険50,000 = 1,326,300
    expect(result).toBe(1_326_300)
  })

  test('医療費控除あり', () => {
    const result = calculateResidentTaxDeductions(
      4_360_000,
      { medicalExpense: 300_000 },
      846_300,
    )
    // 医療費控除 = 300,000 - 100,000 = 200,000
    // 基礎控除430,000 + 社保846,300 + 医療費200,000 = 1,476,300
    expect(result).toBe(1_476_300)
  })

  test('医療費が10万以下なら医療費控除0', () => {
    const result = calculateResidentTaxDeductions(
      4_360_000,
      { medicalExpense: 80_000 },
      846_300,
    )
    expect(result).toBe(1_276_300) // 基礎控除430,000 + 社保846,300 のみ
  })
})

describe('calculateAdjustmentDeduction', () => {
  test('合計所得2500万超は0', () => {
    expect(calculateAdjustmentDeduction(3_000_000, 25_500_000, 50_000)).toBe(0)
  })

  test('課税所得200万以下: min(差額, 課税所得) × 5%', () => {
    // personalDeductionDifference=50,000, taxableIncome=1,500,000
    // min(50,000, 1,500,000) = 50,000
    // 50,000 × 5% = 2,500
    expect(calculateAdjustmentDeduction(1_500_000, 5_000_000, 50_000)).toBe(2_500)
  })

  test('課税所得200万以下で差額が課税所得より大きい場合', () => {
    // personalDeductionDifference=300,000, taxableIncome=200,000
    // min(300,000, 200,000) = 200,000
    // 200,000 × 5% = 10,000
    expect(calculateAdjustmentDeduction(200_000, 5_000_000, 300_000)).toBe(10_000)
  })

  test('Golden Case 1: 課税所得3,083,000 → 125円', () => {
    // taxableIncome=3,083,000 > 2,000,000
    // max(50,000 - (3,083,000 - 2,000,000), 2,500) = max(50,000 - 1,083,000, 2,500) = max(-1,033,000, 2,500) = 2,500
    // 2,500 × 5% = 125
    expect(calculateAdjustmentDeduction(3_083_000, 4_360_000, 50_000)).toBe(125)
  })

  test('Golden Case 2: 課税所得7,708,000 → 125円', () => {
    // taxableIncome=7,708,000 > 2,000,000
    // max(50,000 - (7,708,000 - 2,000,000), 2,500) = max(50,000 - 5,708,000, 2,500) = max(-5,658,000, 2,500) = 2,500
    // 2,500 × 5% = 125
    expect(calculateAdjustmentDeduction(7_708_000, 9_650_000, 50_000)).toBe(125)
  })

  test('課税所得200万超で差額の方が大きい場合', () => {
    // taxableIncome=2,100,000, personalDeductionDiff=200,000
    // max(200,000 - (2,100,000 - 2,000,000), 2,500) = max(200,000 - 100,000, 2,500) = max(100,000, 2,500) = 100,000
    // 100,000 × 5% = 5,000
    expect(calculateAdjustmentDeduction(2_100_000, 5_000_000, 200_000)).toBe(5_000)
  })

  test('合計所得ちょうど2500万は適用あり', () => {
    // totalIncome = 25,000,000 → 2500万以下なので適用
    // taxableIncome=20_000_000 > 2,000,000
    // max(50,000 - (20,000,000 - 2,000,000), 2,500) = max(50,000 - 18,000,000, 2,500) = 2,500
    // 2,500 × 5% = 125
    expect(calculateAdjustmentDeduction(20_000_000, 25_000_000, 50_000)).toBe(125)
  })
})

describe('calculateResidentTax', () => {
  test('Golden Case 1: 給与所得4,360,000 / 社保846,300', () => {
    // taxableIncome = 3,083,000 (after roundTaxableIncome)
    // adjustmentDeduction = 125
    // incomeRate = roundTaxAmount(3,083,000 × 0.10 - 125) = roundTaxAmount(308,175) = 308,100
    // perCapita = 5,000
    // total = 313,100
    const result = calculateResidentTax(3_083_000, 125)
    expect(result.incomeRate).toBe(308_100)
    expect(result.perCapita).toBe(5_000)
    expect(result.total).toBe(313_100)
  })

  test('Golden Case 2: 給与所得9,650,000 / 社保1,511,038', () => {
    // taxableIncome = 7,708,000
    // adjustmentDeduction = 125
    // incomeRate = roundTaxAmount(7,708,000 × 0.10 - 125) = roundTaxAmount(770,675) = 770,600
    // perCapita = 5,000
    // total = 775,600
    const result = calculateResidentTax(7_708_000, 125)
    expect(result.incomeRate).toBe(770_600)
    expect(result.perCapita).toBe(5_000)
    expect(result.total).toBe(775_600)
  })

  test('課税所得0の場合', () => {
    const result = calculateResidentTax(0, 0)
    expect(result.incomeRate).toBe(0)
    expect(result.perCapita).toBe(5_000)
    expect(result.total).toBe(5_000)
  })

  test('調整控除が所得割を上回る場合は所得割0', () => {
    // taxableIncome = 1,000 → 1,000 × 0.10 = 100
    // adjustmentDeduction = 200 → 100 - 200 = -100 → roundTaxAmount clamps to 0
    const result = calculateResidentTax(1_000, 200)
    expect(result.incomeRate).toBe(0)
    expect(result.perCapita).toBe(5_000)
    expect(result.total).toBe(5_000)
  })

  test('調整控除0のケース', () => {
    // taxableIncome = 5,000,000 × 0.10 = 500,000 - 0 = 500,000
    // roundTaxAmount(500,000) = 500,000
    const result = calculateResidentTax(5_000_000, 0)
    expect(result.incomeRate).toBe(500_000)
    expect(result.perCapita).toBe(5_000)
    expect(result.total).toBe(505_000)
  })
})

describe('住民税 end-to-end golden tests', () => {
  test('Case 1: 給与収入600万・35歳・扶養なし', () => {
    // 給与所得: 4,360,000 (600万 - 給与所得控除164万)
    const employmentIncome = 4_360_000
    const socialInsurance = 846_300

    // Step 1: 住民税控除
    const deductions = calculateResidentTaxDeductions(employmentIncome, {}, socialInsurance)
    expect(deductions).toBe(1_276_300) // 430,000 + 846,300

    // Step 2: 課税所得（1,000円未満切捨ては外部で実施する想定だが確認）
    const taxableIncomeRaw = employmentIncome - deductions
    expect(taxableIncomeRaw).toBe(3_083_700)
    // roundTaxableIncome → 3,083,000 (外部で適用)
    const taxableIncome = 3_083_000

    // Step 3: 調整控除
    const adjustmentDeduction = calculateAdjustmentDeduction(
      taxableIncome,
      employmentIncome,
      50_000,
    )
    expect(adjustmentDeduction).toBe(125)

    // Step 4: 住民税
    const tax = calculateResidentTax(taxableIncome, adjustmentDeduction)
    expect(tax.incomeRate).toBe(308_100)
    expect(tax.perCapita).toBe(5_000)
    expect(tax.total).toBe(313_100)
  })

  test('Case 2: 給与収入高額・社保1,511,038', () => {
    // 給与所得: 9,650,000
    const employmentIncome = 9_650_000
    const socialInsurance = 1_511_038

    // Step 1: 住民税控除
    const deductions = calculateResidentTaxDeductions(employmentIncome, {}, socialInsurance)
    expect(deductions).toBe(1_941_038) // 430,000 + 1,511,038

    // Step 2: 課税所得
    const taxableIncomeRaw = employmentIncome - deductions
    expect(taxableIncomeRaw).toBe(7_708_962)
    const taxableIncome = 7_708_000

    // Step 3: 調整控除
    const adjustmentDeduction = calculateAdjustmentDeduction(
      taxableIncome,
      employmentIncome,
      50_000,
    )
    expect(adjustmentDeduction).toBe(125)

    // Step 4: 住民税
    const tax = calculateResidentTax(taxableIncome, adjustmentDeduction)
    expect(tax.incomeRate).toBe(770_600)
    expect(tax.perCapita).toBe(5_000)
    expect(tax.total).toBe(775_600)
  })
})
