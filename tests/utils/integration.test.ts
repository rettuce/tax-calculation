/**
 * 統合テスト
 *
 * 全モジュールを結合した end-to-end の検証。
 * 不変条件: 個人手取り + 法人内部留保 + 税負担 + 社保 ≈ 利益総額
 * 端数処理の累積により ±500円の誤差を許容する。
 */

import { describe, test, expect } from 'vitest'
import { calculateAll, optimize } from '~/utils/optimizer'
import type { CalculationResult, DeductionSettings } from '~/utils/optimizer'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROUNDING_TOLERANCE = 500

const baseDeductions: DeductionSettings = {
  hasYoungDependent: false,
}

/** 不変条件: 個人手取り + 法人内部留保 + 税 + 社保 ≈ 利益 */
function assertConservation(result: CalculationResult, totalProfit: number) {
  const sum =
    result.personalNetIncome +
    result.corporateRetained +
    result.totalTax +
    result.totalSocialInsurance

  expect(Math.abs(sum - totalProfit)).toBeLessThanOrEqual(ROUNDING_TOLERANCE)
}

/** 全金額が非負であることを検証 */
function assertNonNegativeAmounts(result: CalculationResult) {
  expect(result.annualCompensation).toBeGreaterThanOrEqual(0)
  expect(result.socialInsurance.employeeAnnual).toBeGreaterThanOrEqual(0)
  expect(result.socialInsurance.employerAnnual).toBeGreaterThanOrEqual(0)
  expect(result.socialInsurance.totalAnnual).toBeGreaterThanOrEqual(0)
  expect(result.employmentIncome).toBeGreaterThanOrEqual(0)
  expect(result.incomeTaxableIncome).toBeGreaterThanOrEqual(0)
  expect(result.residentTaxableIncome).toBeGreaterThanOrEqual(0)
  expect(result.incomeTax).toBeGreaterThanOrEqual(0)
  expect(result.residentTax).toBeGreaterThanOrEqual(0)
  expect(result.corporateTaxTotal).toBeGreaterThanOrEqual(0)
}

// ---------------------------------------------------------------------------
// Test cases from spec
// ---------------------------------------------------------------------------

const testCases = [
  {
    name: 'Case 1: 利益2000万・月額50万・賞与なし・35歳',
    profit: 20_000_000,
    monthly: 500_000,
    bonus: 0,
    bonusCount: 1 as const,
    age: 35,
  },
  {
    name: 'Case 2: 利益2000万・月額80万・賞与200万・45歳',
    profit: 20_000_000,
    monthly: 800_000,
    bonus: 2_000_000,
    bonusCount: 1 as const,
    age: 45,
  },
  {
    name: 'Case 3: 利益3000万・月額30万・賞与600万・40歳',
    profit: 30_000_000,
    monthly: 300_000,
    bonus: 6_000_000,
    bonusCount: 1 as const,
    age: 40,
  },
]

describe('統合テスト: calculateAll パイプライン', () => {
  for (const tc of testCases) {
    describe(tc.name, () => {
      const result = calculateAll({
        totalProfit: tc.profit,
        monthlyCompensation: tc.monthly,
        bonusAmount: tc.bonus,
        bonusCount: tc.bonusCount,
        age: tc.age,
        prefecture: '東京都',
        deductions: baseDeductions,
      })

      test('資金保存則: 個人手取り + 法人留保 + 税 + 社保 ≈ 利益', () => {
        assertConservation(result, tc.profit)
      })

      test('全金額が非負', () => {
        assertNonNegativeAmounts(result)
      })

      test('年間報酬 = 月額×12 + 賞与', () => {
        expect(result.annualCompensation).toBe(tc.monthly * 12 + tc.bonus)
      })

      test('社保合計 = 従業員分 + 事業主分', () => {
        expect(result.socialInsurance.totalAnnual).toBe(
          result.socialInsurance.employeeAnnual + result.socialInsurance.employerAnnual,
        )
      })

      test('法人所得 = 利益 - 報酬 - 社保事業主分', () => {
        expect(result.corporateIncome).toBe(
          tc.profit - result.annualCompensation - result.socialInsurance.employerAnnual,
        )
      })

      test('個人手取り = 報酬 - 社保本人分 - 所得税 - 住民税', () => {
        expect(result.personalNetIncome).toBe(
          result.annualCompensation -
          result.socialInsurance.employeeAnnual -
          result.incomeTax -
          result.residentTax,
        )
      })

      test('総合手取り = 個人手取り + 法人留保', () => {
        expect(result.totalNetIncome).toBe(
          result.personalNetIncome + result.corporateRetained,
        )
      })

      test('実効税率が0〜1の範囲内', () => {
        expect(result.effectiveTaxRate).toBeGreaterThan(0)
        expect(result.effectiveTaxRate).toBeLessThan(1)
      })
    })
  }
})

describe('統合テスト: 控除の影響', () => {
  test('小規模企業共済 + iDeCo で税負担が減少する', () => {
    const base = calculateAll({
      totalProfit: 20_000_000,
      monthlyCompensation: 500_000,
      bonusAmount: 0,
      bonusCount: 1,
      age: 35,
      prefecture: '東京都',
      deductions: baseDeductions,
    })

    const withDeductions = calculateAll({
      totalProfit: 20_000_000,
      monthlyCompensation: 500_000,
      bonusAmount: 0,
      bonusCount: 1,
      age: 35,
      prefecture: '東京都',
      deductions: {
        hasYoungDependent: false,
        smallBusinessMutualAid: 840_000,
        ideco: 276_000,
      },
    })

    // 所得税と住民税が減る
    expect(withDeductions.incomeTax).toBeLessThan(base.incomeTax)
    expect(withDeductions.residentTax).toBeLessThan(base.residentTax)

    // 両方とも資金保存則を満たす
    assertConservation(base, 20_000_000)
    assertConservation(withDeductions, 20_000_000)
  })

  test('配偶者控除が適用される', () => {
    const without = calculateAll({
      totalProfit: 20_000_000,
      monthlyCompensation: 500_000,
      bonusAmount: 0,
      bonusCount: 1,
      age: 35,
      prefecture: '東京都',
      deductions: baseDeductions,
    })

    const withSpouse = calculateAll({
      totalProfit: 20_000_000,
      monthlyCompensation: 500_000,
      bonusAmount: 0,
      bonusCount: 1,
      age: 35,
      prefecture: '東京都',
      deductions: {
        hasYoungDependent: false,
        spouseIncome: 0,
      },
    })

    expect(withSpouse.incomeTax).toBeLessThan(without.incomeTax)
  })
})

describe('統合テスト: 賞与パターン', () => {
  test('同じ年間報酬でも賞与構成で社保が異なる', () => {
    // 月額50万 + 賞与0 = 年間600万
    const noBonusResult = calculateAll({
      totalProfit: 20_000_000,
      monthlyCompensation: 500_000,
      bonusAmount: 0,
      bonusCount: 1,
      age: 35,
      prefecture: '東京都',
      deductions: baseDeductions,
    })

    // 月額33.3万 + 賞与200万 ≈ 年間600万
    const withBonusResult = calculateAll({
      totalProfit: 20_000_000,
      monthlyCompensation: 333_000,
      bonusAmount: 2_004_000,
      bonusCount: 1,
      age: 35,
      prefecture: '東京都',
      deductions: baseDeductions,
    })

    // 社保額が異なる（年金の上限や標準報酬月額の等級の違い）
    expect(noBonusResult.socialInsurance.totalAnnual).not.toBe(
      withBonusResult.socialInsurance.totalAnnual,
    )

    // 両方とも資金保存則を満たす
    assertConservation(noBonusResult, 20_000_000)
    assertConservation(withBonusResult, 20_000_000)
  })

  test('賞与回数の違いで社保が変わる（年金1回150万上限）', () => {
    // 賞与300万を1回で支給
    const oneTime = calculateAll({
      totalProfit: 20_000_000,
      monthlyCompensation: 500_000,
      bonusAmount: 3_000_000,
      bonusCount: 1,
      age: 35,
      prefecture: '東京都',
      deductions: baseDeductions,
    })

    // 賞与300万を3回で支給（1回100万）
    const threeTime = calculateAll({
      totalProfit: 20_000_000,
      monthlyCompensation: 500_000,
      bonusAmount: 3_000_000,
      bonusCount: 3,
      age: 35,
      prefecture: '東京都',
      deductions: baseDeductions,
    })

    // 1回300万の場合、年金は150万上限で計算されるため差が出る
    // 3回100万の場合、各回100万（150万以内）なので全額が対象
    expect(oneTime.socialInsurance.totalAnnual).not.toBe(
      threeTime.socialInsurance.totalAnnual,
    )
  })
})

describe('統合テスト: 境界値', () => {
  test('報酬0・利益全額法人に残すケース', () => {
    const result = calculateAll({
      totalProfit: 20_000_000,
      monthlyCompensation: 0,
      bonusAmount: 0,
      bonusCount: 1,
      age: 35,
      prefecture: '東京都',
      deductions: baseDeductions,
    })

    expect(result.annualCompensation).toBe(0)
    // 報酬0でも社保最低等級分 + 均等割が発生するため、個人手取りはマイナスになる
    expect(result.personalNetIncome).toBeLessThan(0)
    expect(result.incomeTax).toBe(0)
    // 法人所得 = 利益 - 報酬(0) - 社保事業主分
    expect(result.corporateIncome).toBe(
      20_000_000 - result.socialInsurance.employerAnnual,
    )
    assertConservation(result, 20_000_000)
  })

  test('利益のほぼ全額を報酬にするケース', () => {
    // 月額100万 = 年間1200万（利益2000万から社保を引いてもまだ法人所得が残る）
    const result = calculateAll({
      totalProfit: 20_000_000,
      monthlyCompensation: 1_000_000,
      bonusAmount: 0,
      bonusCount: 1,
      age: 35,
      prefecture: '東京都',
      deductions: baseDeductions,
    })

    expect(result.personalNetIncome).toBeGreaterThan(0)
    assertConservation(result, 20_000_000)
  })
})

describe('統合テスト: optimize', () => {
  const OPTIMIZATION_TIMEOUT = 60_000

  test('maxTotalRetained の結果がCase 1の手動計算以上', () => {
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

    // 最適化結果はCase 1より総合手取りが多いか同等
    expect(optimized.totalNetIncome).toBeGreaterThanOrEqual(
      manualResult.totalNetIncome,
    )

    // 最適化結果も資金保存則を満たす
    assertConservation(optimized, 20_000_000)
  }, OPTIMIZATION_TIMEOUT)

  test('最適化結果の資金保存則', () => {
    const goals: ('maxNetIncome' | 'maxTotalRetained' | 'minTaxRate' | 'minSocialInsurance')[] = [
      'maxNetIncome',
      'maxTotalRetained',
      'minTaxRate',
      'minSocialInsurance',
    ]

    for (const goal of goals) {
      const result = optimize({
        totalProfit: 20_000_000,
        age: 35,
        prefecture: '東京都',
        goal,
        deductions: baseDeductions,
      })

      assertConservation(result, 20_000_000)
    }
  }, OPTIMIZATION_TIMEOUT)

  test('異なるゴールで異なる最適点を返す', () => {
    const netIncome = optimize({
      totalProfit: 20_000_000,
      age: 35,
      prefecture: '東京都',
      goal: 'maxNetIncome',
      deductions: baseDeductions,
    })

    const minSI = optimize({
      totalProfit: 20_000_000,
      age: 35,
      prefecture: '東京都',
      goal: 'minSocialInsurance',
      deductions: baseDeductions,
    })

    // maxNetIncomeとminSocialInsuranceは異なる最適点になるはず
    // （社保最小化は報酬最小化、手取り最大化は適度な報酬を好む）
    expect(netIncome.monthlyCompensation).not.toBe(minSI.monthlyCompensation)
  }, OPTIMIZATION_TIMEOUT)

  test('高利益ケース（3000万）でも正しく動作する', () => {
    const result = optimize({
      totalProfit: 30_000_000,
      age: 40,
      prefecture: '東京都',
      goal: 'maxTotalRetained',
      deductions: baseDeductions,
    })

    expect(result.totalNetIncome).toBeGreaterThan(0)
    assertConservation(result, 30_000_000)
    expect(result.reason).toBeTruthy()
  }, OPTIMIZATION_TIMEOUT)
})
