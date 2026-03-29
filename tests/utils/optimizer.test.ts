import { describe, test, expect } from 'vitest'
import { calculateAll, optimize } from '~/utils/optimizer'
import type {
  CalculationInput,
  CalculationResult,
  DeductionSettings,
  OptimizationGoal,
} from '~/utils/optimizer'

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const baseDeductions: DeductionSettings = {
  hasYoungDependent: false,
}

function makeInput(overrides: Partial<CalculationInput> = {}): CalculationInput {
  return {
    totalProfit: 20_000_000,
    monthlyCompensation: 500_000,
    bonusAmount: 0,
    bonusCount: 1,
    age: 35,
    prefecture: '東京都',
    deductions: baseDeductions,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// calculateAll
// ---------------------------------------------------------------------------

describe('calculateAll', () => {
  test('年間報酬の計算が正しい（月額×12 + 賞与）', () => {
    const result = calculateAll(makeInput({
      monthlyCompensation: 500_000,
      bonusAmount: 1_000_000,
    }))
    expect(result.annualCompensation).toBe(7_000_000)
    expect(result.monthlyCompensation).toBe(500_000)
    expect(result.bonusAmount).toBe(1_000_000)
  })

  test('社会保険料が正しく計算される', () => {
    const result = calculateAll(makeInput())
    // 社保は0より大きいこと
    expect(result.socialInsurance.employeeAnnual).toBeGreaterThan(0)
    expect(result.socialInsurance.employerAnnual).toBeGreaterThan(0)
    expect(result.socialInsurance.totalAnnual).toBe(
      result.socialInsurance.employeeAnnual + result.socialInsurance.employerAnnual,
    )
  })

  test('給与所得が正しく計算される', () => {
    // 月額50万 = 年収600万 → 給与所得控除164万 → 給与所得436万
    const result = calculateAll(makeInput({
      monthlyCompensation: 500_000,
      bonusAmount: 0,
    }))
    expect(result.employmentIncome).toBe(4_360_000)
  })

  test('課税所得が0未満にならない', () => {
    // 報酬が非常に低い場合でも課税所得は0
    const result = calculateAll(makeInput({
      monthlyCompensation: 0,
      bonusAmount: 0,
    }))
    expect(result.incomeTaxableIncome).toBe(0)
    expect(result.residentTaxableIncome).toBe(0)
  })

  test('所得税と住民税が0以上', () => {
    const result = calculateAll(makeInput())
    expect(result.incomeTax).toBeGreaterThanOrEqual(0)
    expect(result.residentTax).toBeGreaterThanOrEqual(0)
  })

  test('法人所得 = 利益 - 報酬 - 社保事業主分', () => {
    const result = calculateAll(makeInput())
    expect(result.corporateIncome).toBe(
      20_000_000 - result.annualCompensation - result.socialInsurance.employerAnnual,
    )
  })

  test('法人内部留保 = 法人所得 - 法人税等', () => {
    const result = calculateAll(makeInput())
    expect(result.corporateRetained).toBe(
      result.corporateIncome - result.corporateTaxTotal,
    )
  })

  test('総合手取り = 個人手取り + 法人内部留保', () => {
    const result = calculateAll(makeInput())
    expect(result.totalNetIncome).toBe(
      result.personalNetIncome + result.corporateRetained,
    )
  })

  test('税負担合計 = 所得税 + 住民税 + 法人税等', () => {
    const result = calculateAll(makeInput())
    expect(result.totalTax).toBe(
      result.incomeTax + result.residentTax + result.corporateTaxTotal,
    )
  })

  test('実効税率 = (税合計 + 社保合計) / 利益', () => {
    const result = calculateAll(makeInput())
    const expected = (result.totalTax + result.totalSocialInsurance) / 20_000_000
    expect(result.effectiveTaxRate).toBeCloseTo(expected, 10)
  })

  test('高額報酬ケース（月額80万 + 賞与200万）', () => {
    const result = calculateAll(makeInput({
      monthlyCompensation: 800_000,
      bonusAmount: 2_000_000,
      bonusCount: 1,
      age: 45,
    }))

    expect(result.annualCompensation).toBe(11_600_000)
    expect(result.employmentIncome).toBe(9_650_000) // 1160万 - 195万 = 965万
    expect(result.socialInsurance.totalAnnual).toBeGreaterThan(0)
    expect(result.totalNetIncome).toBeGreaterThan(0)
  })

  test('低報酬ケース（月額30万 + 賞与600万）', () => {
    const result = calculateAll(makeInput({
      totalProfit: 30_000_000,
      monthlyCompensation: 300_000,
      bonusAmount: 6_000_000,
      bonusCount: 1,
      age: 40,
    }))

    expect(result.annualCompensation).toBe(9_600_000)
    // 法人にたくさん残る
    expect(result.corporateIncome).toBeGreaterThan(10_000_000)
  })

  test('控除が正しく反映される（小規模企業共済 + iDeCo）', () => {
    const withoutExtra = calculateAll(makeInput())
    const withExtra = calculateAll(makeInput({
      deductions: {
        hasYoungDependent: false,
        smallBusinessMutualAid: 840_000,
        ideco: 276_000,
      },
    }))

    // 控除が増えた分、所得税が減る
    expect(withExtra.incomeTaxDeductions).toBeGreaterThan(withoutExtra.incomeTaxDeductions)
    expect(withExtra.incomeTax).toBeLessThan(withoutExtra.incomeTax)
  })

  test('介護保険対象年齢（40-64歳）で社保が増える', () => {
    const age35 = calculateAll(makeInput({ age: 35 }))
    const age45 = calculateAll(makeInput({ age: 45 }))

    // 40歳以上は介護保険が加算される
    expect(age45.socialInsurance.employeeAnnual).toBeGreaterThan(
      age35.socialInsurance.employeeAnnual,
    )
  })

  test('利益が0の場合', () => {
    const result = calculateAll(makeInput({
      totalProfit: 0,
      monthlyCompensation: 0,
      bonusAmount: 0,
    }))
    expect(result.totalNetIncome).toBeLessThanOrEqual(0)
    expect(result.effectiveTaxRate).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// optimize
// ---------------------------------------------------------------------------

describe('optimize', () => {
  // 最適化テストはタイムアウトを長めに設定
  const OPTIMIZATION_TIMEOUT = 60_000

  test('maxNetIncome: 個人手取りを最大化する結果を返す', () => {
    const result = optimize({
      totalProfit: 20_000_000,
      age: 35,
      prefecture: '東京都',
      goal: 'maxNetIncome',
      deductions: baseDeductions,
    })

    expect(result.personalNetIncome).toBeGreaterThan(0)
    expect(result.reason).toContain('個人手取り')
    expect(result.reason).toContain('ブラケット')
  }, OPTIMIZATION_TIMEOUT)

  test('maxTotalRetained: 総合手取りを最大化する結果を返す', () => {
    const result = optimize({
      totalProfit: 20_000_000,
      age: 35,
      prefecture: '東京都',
      goal: 'maxTotalRetained',
      deductions: baseDeductions,
    })

    expect(result.totalNetIncome).toBeGreaterThan(0)
    expect(result.reason).toContain('総合手取り')
  }, OPTIMIZATION_TIMEOUT)

  test('minSocialInsurance: 社会保険料が最小となる結果を返す', () => {
    const result = optimize({
      totalProfit: 20_000_000,
      age: 35,
      prefecture: '東京都',
      goal: 'minSocialInsurance',
      deductions: baseDeductions,
    })

    expect(result.socialInsurance.totalAnnual).toBeGreaterThanOrEqual(0)
    expect(result.reason).toContain('社会保険料')
  }, OPTIMIZATION_TIMEOUT)

  test('異なるゴールで異なる最適点を返す', () => {
    const goals: OptimizationGoal[] = [
      'maxNetIncome',
      'maxTotalRetained',
      'minSocialInsurance',
    ]

    const results = goals.map((goal) =>
      optimize({
        totalProfit: 20_000_000,
        age: 35,
        prefecture: '東京都',
        goal,
        deductions: baseDeductions,
      }),
    )

    // 少なくとも一部のゴールは異なる月額を返す
    const uniqueMonthly = new Set(results.map((r) => r.monthlyCompensation))
    expect(uniqueMonthly.size).toBeGreaterThan(1)
  }, OPTIMIZATION_TIMEOUT)

  test('最適化結果の全金額が0以上', () => {
    const result = optimize({
      totalProfit: 20_000_000,
      age: 35,
      prefecture: '東京都',
      goal: 'maxTotalRetained',
      deductions: baseDeductions,
    })

    expect(result.annualCompensation).toBeGreaterThanOrEqual(0)
    expect(result.socialInsurance.totalAnnual).toBeGreaterThanOrEqual(0)
    expect(result.incomeTax).toBeGreaterThanOrEqual(0)
    expect(result.residentTax).toBeGreaterThanOrEqual(0)
    expect(result.corporateTaxTotal).toBeGreaterThanOrEqual(0)
  }, OPTIMIZATION_TIMEOUT)

  test('maxTotalRetained の結果が手動ケース（月額50万）より良い', () => {
    const manualResult = calculateAll({
      totalProfit: 20_000_000,
      monthlyCompensation: 500_000,
      bonusAmount: 0,
      bonusCount: 1,
      age: 35,
      prefecture: '東京都',
      deductions: baseDeductions,
    })

    const optimized = optimize({
      totalProfit: 20_000_000,
      age: 35,
      prefecture: '東京都',
      goal: 'maxTotalRetained',
      deductions: baseDeductions,
    })

    expect(optimized.totalNetIncome).toBeGreaterThanOrEqual(
      manualResult.totalNetIncome,
    )
  }, OPTIMIZATION_TIMEOUT)

  test('利益が小さい場合のフォールバック', () => {
    const result = optimize({
      totalProfit: 100_000,
      age: 35,
      prefecture: '東京都',
      goal: 'maxTotalRetained',
      deductions: baseDeductions,
    })

    // 結果が返ること（エラーにならない）
    expect(result.reason).toBeTruthy()
  }, OPTIMIZATION_TIMEOUT)
})
