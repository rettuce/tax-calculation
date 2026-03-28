import { describe, test, expect } from 'vitest'
import {
  calculateEmploymentIncomeDeduction,
  calculateEmploymentIncome,
  calculateIncomeTax,
  calculateReconstructionTax,
  calculateTotalIncomeTax,
} from '~/utils/income-tax-calculator'

describe('calculateEmploymentIncomeDeduction', () => {
  test('最低保障額65万（190万以下）', () => {
    expect(calculateEmploymentIncomeDeduction(1_500_000)).toBe(650_000)
    expect(calculateEmploymentIncomeDeduction(1_900_000)).toBe(650_000)
  })

  test('190万超〜360万以下: 収入×30% + 8万', () => {
    expect(calculateEmploymentIncomeDeduction(2_000_000)).toBe(680_000) // 2,000,000 * 0.30 + 80,000
    expect(calculateEmploymentIncomeDeduction(3_600_000)).toBe(1_160_000) // 3,600,000 * 0.30 + 80,000
  })

  test('360万超〜660万以下: 収入×20% + 44万', () => {
    expect(calculateEmploymentIncomeDeduction(6_000_000)).toBe(1_640_000) // 6,000,000 * 0.20 + 440,000
  })

  test('660万超〜850万以下: 収入×10% + 110万', () => {
    expect(calculateEmploymentIncomeDeduction(8_000_000)).toBe(1_900_000) // 8,000,000 * 0.10 + 1,100,000
    expect(calculateEmploymentIncomeDeduction(8_500_000)).toBe(1_950_000)
  })

  test('上限195万（850万超）', () => {
    expect(calculateEmploymentIncomeDeduction(10_000_000)).toBe(1_950_000)
    expect(calculateEmploymentIncomeDeduction(20_000_000)).toBe(1_950_000)
  })

  test('収入0の場合', () => {
    expect(calculateEmploymentIncomeDeduction(0)).toBe(650_000)
  })
})

describe('calculateEmploymentIncome', () => {
  test('給与収入 - 給与所得控除', () => {
    expect(calculateEmploymentIncome(6_000_000)).toBe(4_360_000) // 6,000,000 - 1,640,000
    expect(calculateEmploymentIncome(10_000_000)).toBe(8_050_000) // 10,000,000 - 1,950,000
  })

  test('控除額が収入を超える場合は0', () => {
    expect(calculateEmploymentIncome(500_000)).toBe(0) // 500,000 - 650,000 → 0
  })
})

describe('calculateIncomeTax', () => {
  test('課税所得500万 → 572,500円', () => {
    expect(calculateIncomeTax(5_000_000)).toBe(572_500)
  })

  test('課税所得1000万 → 1,764,000円', () => {
    expect(calculateIncomeTax(10_000_000)).toBe(1_764_000)
  })

  test('1,000円未満の端数を切り捨ててから計算', () => {
    // 5,000,999 → roundTaxableIncome → 5,000,000 → 572,500
    expect(calculateIncomeTax(5_000_999)).toBe(572_500)
  })

  test('課税所得195万以下（5%ブラケット）', () => {
    expect(calculateIncomeTax(1_000_000)).toBe(50_000) // 1,000,000 * 0.05 - 0
  })

  test('課税所得0の場合', () => {
    expect(calculateIncomeTax(0)).toBe(0)
  })

  test('課税所得が999円以下の場合（切捨て後0になる）', () => {
    expect(calculateIncomeTax(999)).toBe(0)
  })

  test('高額所得（4000万超・45%ブラケット）', () => {
    // 50,000,000 * 0.45 - 4,796,000 = 22,500,000 - 4,796,000 = 17,704,000
    expect(calculateIncomeTax(50_000_000)).toBe(17_704_000)
  })
})

describe('calculateReconstructionTax', () => {
  test('所得税額 × 2.1% の端数切捨て', () => {
    expect(calculateReconstructionTax(572_500)).toBe(12_022) // 572,500 * 0.021 = 12,022.5 → 12,022
    expect(calculateReconstructionTax(1_764_000)).toBe(37_044) // 1,764,000 * 0.021 = 37,044.0 → 37,044
  })

  test('所得税0の場合', () => {
    expect(calculateReconstructionTax(0)).toBe(0)
  })
})

describe('calculateTotalIncomeTax', () => {
  test('課税所得500万 → 584,500円（所得税+復興税の合計を100円未満切捨て）', () => {
    // 所得税: 572,500
    // 復興税: Math.floor(572,500 * 0.021) = 12,022
    // 合計: 584,522 → roundTaxAmount → 584,500
    expect(calculateTotalIncomeTax(5_000_000)).toBe(584_500)
  })

  test('課税所得1000万', () => {
    // 所得税: 1,764,000
    // 復興税: Math.floor(1,764,000 * 0.021) = 37,044
    // 合計: 1,801,044 → roundTaxAmount → 1,801,000
    expect(calculateTotalIncomeTax(10_000_000)).toBe(1_801_000)
  })

  test('課税所得0', () => {
    expect(calculateTotalIncomeTax(0)).toBe(0)
  })
})
