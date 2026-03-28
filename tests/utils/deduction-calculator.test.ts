import { describe, test, expect } from 'vitest'
import {
  getBasicDeduction,
  calculateSpouseDeduction,
  calculateDependentDeduction,
  calculateIncomeAdjustmentDeduction,
  calculateLifeInsuranceDeduction,
  calculateAllDeductions,
} from '~/utils/deduction-calculator'
import type { DependentInput } from '~/utils/deduction-calculator'

// =============================================================================
// getBasicDeduction
// =============================================================================
describe('getBasicDeduction', () => {
  test('合計所得132万以下 → 所得税95万 / 住民税43万', () => {
    expect(getBasicDeduction(1_000_000, 'incomeTax')).toBe(950_000)
    expect(getBasicDeduction(1_000_000, 'residentTax')).toBe(430_000)
    expect(getBasicDeduction(1_320_000, 'incomeTax')).toBe(950_000)
    expect(getBasicDeduction(1_320_000, 'residentTax')).toBe(430_000)
  })

  test('合計所得336万以下 → 所得税88万 / 住民税43万', () => {
    expect(getBasicDeduction(2_000_000, 'incomeTax')).toBe(880_000)
    expect(getBasicDeduction(2_000_000, 'residentTax')).toBe(430_000)
  })

  test('合計所得436万（489万以下）→ 所得税68万 / 住民税43万', () => {
    expect(getBasicDeduction(4_360_000, 'incomeTax')).toBe(680_000)
    expect(getBasicDeduction(4_360_000, 'residentTax')).toBe(430_000)
  })

  test('合計所得655万以下 → 所得税63万 / 住民税43万', () => {
    expect(getBasicDeduction(6_000_000, 'incomeTax')).toBe(630_000)
    expect(getBasicDeduction(6_000_000, 'residentTax')).toBe(430_000)
  })

  test('合計所得965万（2350万以下）→ 所得税58万 / 住民税43万', () => {
    expect(getBasicDeduction(9_650_000, 'incomeTax')).toBe(580_000)
    expect(getBasicDeduction(9_650_000, 'residentTax')).toBe(430_000)
  })

  test('合計所得2400万以下 → 所得税48万 / 住民税29万', () => {
    expect(getBasicDeduction(24_000_000, 'incomeTax')).toBe(480_000)
    expect(getBasicDeduction(24_000_000, 'residentTax')).toBe(290_000)
  })

  test('合計所得2450万以下 → 所得税32万 / 住民税15万', () => {
    expect(getBasicDeduction(24_500_000, 'incomeTax')).toBe(320_000)
    expect(getBasicDeduction(24_500_000, 'residentTax')).toBe(150_000)
  })

  test('合計所得2500万以下 → 所得税16万 / 住民税0', () => {
    expect(getBasicDeduction(25_000_000, 'incomeTax')).toBe(160_000)
    expect(getBasicDeduction(25_000_000, 'residentTax')).toBe(0)
  })

  test('合計所得2500万超 → 所得税0 / 住民税0', () => {
    expect(getBasicDeduction(25_000_001, 'incomeTax')).toBe(0)
    expect(getBasicDeduction(25_000_001, 'residentTax')).toBe(0)
    expect(getBasicDeduction(30_000_000, 'incomeTax')).toBe(0)
    expect(getBasicDeduction(30_000_000, 'residentTax')).toBe(0)
  })

  test('合計所得0の場合', () => {
    expect(getBasicDeduction(0, 'incomeTax')).toBe(950_000)
    expect(getBasicDeduction(0, 'residentTax')).toBe(430_000)
  })
})

// =============================================================================
// calculateSpouseDeduction
// =============================================================================
describe('calculateSpouseDeduction', () => {
  describe('配偶者控除（配偶者所得58万以下）', () => {
    test('本人所得900万以下 → 所得税38万 / 住民税33万', () => {
      expect(calculateSpouseDeduction(8_000_000, 500_000, 'incomeTax')).toBe(380_000)
      expect(calculateSpouseDeduction(8_000_000, 500_000, 'residentTax')).toBe(330_000)
    })

    test('本人所得950万以下 → 所得税26万 / 住民税22万', () => {
      expect(calculateSpouseDeduction(9_500_000, 500_000, 'incomeTax')).toBe(260_000)
      expect(calculateSpouseDeduction(9_500_000, 500_000, 'residentTax')).toBe(220_000)
    })

    test('本人所得1000万以下 → 所得税13万 / 住民税11万', () => {
      expect(calculateSpouseDeduction(10_000_000, 500_000, 'incomeTax')).toBe(130_000)
      expect(calculateSpouseDeduction(10_000_000, 500_000, 'residentTax')).toBe(110_000)
    })
  })

  test('本人所得1000万超 → 0', () => {
    expect(calculateSpouseDeduction(10_000_001, 500_000, 'incomeTax')).toBe(0)
    expect(calculateSpouseDeduction(10_000_001, 500_000, 'residentTax')).toBe(0)
  })

  describe('配偶者特別控除（配偶者所得58万超〜133万以下）', () => {
    test('配偶者所得95万以下・本人所得900万以下 → 所得税38万 / 住民税33万', () => {
      expect(calculateSpouseDeduction(8_000_000, 800_000, 'incomeTax')).toBe(380_000)
      expect(calculateSpouseDeduction(8_000_000, 800_000, 'residentTax')).toBe(330_000)
    })

    test('配偶者所得100万超〜105万以下・本人所得900万以下 → 所得税31万 / 住民税31万', () => {
      expect(calculateSpouseDeduction(8_000_000, 1_050_000, 'incomeTax')).toBe(310_000)
      expect(calculateSpouseDeduction(8_000_000, 1_050_000, 'residentTax')).toBe(310_000)
    })

    test('配偶者所得130万超〜133万以下・本人所得950万以下 → 所得税2万 / 住民税2万', () => {
      expect(calculateSpouseDeduction(9_500_000, 1_310_000, 'incomeTax')).toBe(20_000)
      expect(calculateSpouseDeduction(9_500_000, 1_310_000, 'residentTax')).toBe(20_000)
    })
  })

  test('配偶者所得133万超 → 0', () => {
    expect(calculateSpouseDeduction(8_000_000, 1_330_001, 'incomeTax')).toBe(0)
    expect(calculateSpouseDeduction(8_000_000, 1_330_001, 'residentTax')).toBe(0)
  })

  test('配偶者所得ちょうど58万 → 配偶者控除適用', () => {
    expect(calculateSpouseDeduction(8_000_000, 580_000, 'incomeTax')).toBe(380_000)
    expect(calculateSpouseDeduction(8_000_000, 580_000, 'residentTax')).toBe(330_000)
  })
})

// =============================================================================
// calculateDependentDeduction
// =============================================================================
describe('calculateDependentDeduction', () => {
  test('一般扶養親族1人 → 所得税38万 / 住民税33万', () => {
    const dependents: DependentInput[] = [{ type: 'general', count: 1 }]
    expect(calculateDependentDeduction(dependents, 'incomeTax')).toBe(380_000)
    expect(calculateDependentDeduction(dependents, 'residentTax')).toBe(330_000)
  })

  test('特定扶養親族1人 → 所得税63万 / 住民税45万', () => {
    const dependents: DependentInput[] = [{ type: 'specific', count: 1 }]
    expect(calculateDependentDeduction(dependents, 'incomeTax')).toBe(630_000)
    expect(calculateDependentDeduction(dependents, 'residentTax')).toBe(450_000)
  })

  test('老人扶養（非同居）1人 → 所得税48万 / 住民税38万', () => {
    const dependents: DependentInput[] = [{ type: 'elderly', count: 1 }]
    expect(calculateDependentDeduction(dependents, 'incomeTax')).toBe(480_000)
    expect(calculateDependentDeduction(dependents, 'residentTax')).toBe(380_000)
  })

  test('老人扶養（同居）1人 → 所得税58万 / 住民税45万', () => {
    const dependents: DependentInput[] = [{ type: 'elderlyCoResident', count: 1 }]
    expect(calculateDependentDeduction(dependents, 'incomeTax')).toBe(580_000)
    expect(calculateDependentDeduction(dependents, 'residentTax')).toBe(450_000)
  })

  test('複数種類の合算', () => {
    const dependents: DependentInput[] = [
      { type: 'general', count: 2 },
      { type: 'specific', count: 1 },
    ]
    // 所得税: 380,000 * 2 + 630,000 * 1 = 1,390,000
    expect(calculateDependentDeduction(dependents, 'incomeTax')).toBe(1_390_000)
    // 住民税: 330,000 * 2 + 450,000 * 1 = 1,110,000
    expect(calculateDependentDeduction(dependents, 'residentTax')).toBe(1_110_000)
  })

  test('空配列 → 0', () => {
    expect(calculateDependentDeduction([], 'incomeTax')).toBe(0)
    expect(calculateDependentDeduction([], 'residentTax')).toBe(0)
  })

  test('count=0は無視', () => {
    const dependents: DependentInput[] = [{ type: 'general', count: 0 }]
    expect(calculateDependentDeduction(dependents, 'incomeTax')).toBe(0)
  })
})

// =============================================================================
// calculateIncomeAdjustmentDeduction
// =============================================================================
describe('calculateIncomeAdjustmentDeduction', () => {
  test('給与収入1000万・23歳未満扶養あり → 15万（上限）', () => {
    // (10,000,000 - 8,500,000) * 10% = 150,000
    expect(calculateIncomeAdjustmentDeduction(10_000_000, true)).toBe(150_000)
  })

  test('給与収入900万・23歳未満扶養あり → 5万', () => {
    // (9,000,000 - 8,500,000) * 10% = 50,000
    expect(calculateIncomeAdjustmentDeduction(9_000_000, true)).toBe(50_000)
  })

  test('給与収入1000万・23歳未満扶養なし → 0', () => {
    expect(calculateIncomeAdjustmentDeduction(10_000_000, false)).toBe(0)
  })

  test('給与収入850万以下 → 0（条件不充足）', () => {
    expect(calculateIncomeAdjustmentDeduction(8_500_000, true)).toBe(0)
    expect(calculateIncomeAdjustmentDeduction(7_000_000, true)).toBe(0)
  })

  test('給与収入2000万 → 15万（上限キャップ）', () => {
    // (20,000,000 - 8,500,000) * 10% = 1,150,000 → capped at 150,000
    expect(calculateIncomeAdjustmentDeduction(20_000_000, true)).toBe(150_000)
  })
})

// =============================================================================
// calculateLifeInsuranceDeduction
// =============================================================================
describe('calculateLifeInsuranceDeduction', () => {
  test('所得税: 上限12万', () => {
    expect(calculateLifeInsuranceDeduction(200_000, 'incomeTax')).toBe(120_000)
    expect(calculateLifeInsuranceDeduction(120_000, 'incomeTax')).toBe(120_000)
  })

  test('所得税: 上限未満はそのまま', () => {
    expect(calculateLifeInsuranceDeduction(80_000, 'incomeTax')).toBe(80_000)
    expect(calculateLifeInsuranceDeduction(0, 'incomeTax')).toBe(0)
  })

  test('住民税: 上限7万', () => {
    expect(calculateLifeInsuranceDeduction(200_000, 'residentTax')).toBe(70_000)
    expect(calculateLifeInsuranceDeduction(70_000, 'residentTax')).toBe(70_000)
  })

  test('住民税: 上限未満はそのまま', () => {
    expect(calculateLifeInsuranceDeduction(50_000, 'residentTax')).toBe(50_000)
    expect(calculateLifeInsuranceDeduction(0, 'residentTax')).toBe(0)
  })
})

// =============================================================================
// calculateAllDeductions
// =============================================================================
describe('calculateAllDeductions', () => {
  test('基礎控除のみ（年収600万相当、所得436万）', () => {
    const result = calculateAllDeductions({
      totalIncome: 4_360_000,
      grossIncome: 6_000_000,
      hasYoungDependent: false,
    })

    expect(result.breakdown.basic.incomeTax).toBe(680_000)
    expect(result.breakdown.basic.residentTax).toBe(430_000)
    expect(result.incomeTaxTotal).toBe(680_000)
    expect(result.residentTaxTotal).toBe(430_000)
  })

  test('扶養控除・配偶者控除込みの総合ケース', () => {
    const result = calculateAllDeductions({
      totalIncome: 4_360_000,
      grossIncome: 6_000_000,
      hasYoungDependent: false,
      spouseIncome: 500_000,
      dependents: [
        { type: 'general', count: 1 },
        { type: 'specific', count: 1 },
      ],
      lifeInsurancePremium: 200_000,
    })

    // 基礎控除: 所得税68万 / 住民税43万
    expect(result.breakdown.basic.incomeTax).toBe(680_000)
    expect(result.breakdown.basic.residentTax).toBe(430_000)

    // 配偶者控除: 所得税38万 / 住民税33万（本人所得436万、配偶者所得50万）
    expect(result.breakdown.spouse.incomeTax).toBe(380_000)
    expect(result.breakdown.spouse.residentTax).toBe(330_000)

    // 扶養控除: 所得税 38万+63万=101万 / 住民税 33万+45万=78万
    expect(result.breakdown.dependent.incomeTax).toBe(1_010_000)
    expect(result.breakdown.dependent.residentTax).toBe(780_000)

    // 生命保険料控除: 所得税12万 / 住民税7万
    expect(result.breakdown.lifeInsurance.incomeTax).toBe(120_000)
    expect(result.breakdown.lifeInsurance.residentTax).toBe(70_000)

    // 所得金額調整控除: 0（850万以下）
    expect(result.breakdown.incomeAdjustment.incomeTax).toBe(0)

    // 合計
    const expectedIT = 680_000 + 380_000 + 1_010_000 + 120_000 + 0
    const expectedRT = 430_000 + 330_000 + 780_000 + 70_000
    expect(result.incomeTaxTotal).toBe(expectedIT) // 2,190,000
    expect(result.residentTaxTotal).toBe(expectedRT) // 1,610,000
  })

  test('所得金額調整控除が適用されるケース', () => {
    const result = calculateAllDeductions({
      totalIncome: 8_050_000,
      grossIncome: 10_000_000,
      hasYoungDependent: true,
    })

    // 基礎控除: 所得税58万 / 住民税43万
    expect(result.breakdown.basic.incomeTax).toBe(580_000)
    expect(result.breakdown.basic.residentTax).toBe(430_000)

    // 所得金額調整: (10,000,000 - 8,500,000) * 10% = 150,000（所得税のみ）
    expect(result.breakdown.incomeAdjustment.incomeTax).toBe(150_000)

    expect(result.incomeTaxTotal).toBe(580_000 + 150_000) // 730,000
    expect(result.residentTaxTotal).toBe(430_000)
  })

  test('高額所得で基礎控除なし', () => {
    const result = calculateAllDeductions({
      totalIncome: 25_000_001,
      grossIncome: 30_000_000,
      hasYoungDependent: false,
    })

    expect(result.breakdown.basic.incomeTax).toBe(0)
    expect(result.breakdown.basic.residentTax).toBe(0)
    expect(result.incomeTaxTotal).toBe(0)
    expect(result.residentTaxTotal).toBe(0)
  })

  test('省略可能パラメータがない場合はデフォルト0', () => {
    const result = calculateAllDeductions({
      totalIncome: 4_360_000,
      grossIncome: 6_000_000,
      hasYoungDependent: false,
    })

    expect(result.breakdown.spouse.incomeTax).toBe(0)
    expect(result.breakdown.spouse.residentTax).toBe(0)
    expect(result.breakdown.dependent.incomeTax).toBe(0)
    expect(result.breakdown.dependent.residentTax).toBe(0)
    expect(result.breakdown.lifeInsurance.incomeTax).toBe(0)
    expect(result.breakdown.lifeInsurance.residentTax).toBe(0)
    expect(result.breakdown.incomeAdjustment.incomeTax).toBe(0)
  })
})
