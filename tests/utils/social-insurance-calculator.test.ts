import { describe, test, expect } from 'vitest'
import {
  findStandardRemunerationGrade,
  calculateMonthlyPremiums,
  calculateBonusPremiums,
  calculateAnnualSocialInsurance,
} from '~/utils/social-insurance-calculator'
import { socialInsurance2025 } from '~/config/social-insurance'

const TOLERANCE = 200

function approx(actual: number, expected: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(TOLERANCE)
}

describe('findStandardRemunerationGrade', () => {
  const grades = socialInsurance2025.grades

  test('最低等級（58,000円未満）', () => {
    const result = findStandardRemunerationGrade(50_000, grades)
    expect(result.healthStandard).toBe(58_000)
    expect(result.pensionStandard).toBe(88_000) // 年金は最低88,000
  })

  test('最低等級の境界（58,000 = 第1級）', () => {
    const result = findStandardRemunerationGrade(58_000, grades)
    expect(result.healthStandard).toBe(58_000)
    expect(result.pensionStandard).toBe(88_000)
  })

  test('健保第2級: 63,000以上73,000未満', () => {
    const result = findStandardRemunerationGrade(68_000, grades)
    expect(result.healthStandard).toBe(68_000)
    expect(result.pensionStandard).toBe(88_000)
  })

  test('健保第3級: 73,000以上83,000未満', () => {
    const result = findStandardRemunerationGrade(78_000, grades)
    expect(result.healthStandard).toBe(78_000)
    expect(result.pensionStandard).toBe(88_000)
  })

  test('健保・厚生年金共通帯: 500,000円', () => {
    const result = findStandardRemunerationGrade(500_000, grades)
    expect(result.healthStandard).toBe(500_000)
    expect(result.pensionStandard).toBe(500_000)
  })

  test('健保・厚生年金共通帯: 300,000円', () => {
    const result = findStandardRemunerationGrade(300_000, grades)
    expect(result.healthStandard).toBe(300_000)
    expect(result.pensionStandard).toBe(300_000)
  })

  test('厚生年金上限超え（健保36級以上）: 800,000円', () => {
    const result = findStandardRemunerationGrade(800_000, grades)
    expect(result.healthStandard).toBe(790_000) // 健保39級
    expect(result.pensionStandard).toBe(650_000) // 年金は上限650,000
  })

  test('最高等級（1,355,000円以上）', () => {
    const result = findStandardRemunerationGrade(2_000_000, grades)
    expect(result.healthStandard).toBe(1_390_000) // 健保50級
    expect(result.pensionStandard).toBe(650_000)
  })

  test('境界値: upperBound直前', () => {
    // 第30級: 485,000 <= x < 515,000 → 標準報酬月額500,000
    const result = findStandardRemunerationGrade(514_999, grades)
    expect(result.healthStandard).toBe(500_000)
  })

  test('境界値: upperBound丁度で次の等級', () => {
    // 515,000 は第31級（530,000）の範囲
    const result = findStandardRemunerationGrade(515_000, grades)
    expect(result.healthStandard).toBe(530_000)
  })
})

describe('calculateMonthlyPremiums', () => {
  const { rates } = socialInsurance2025

  test('500,000円・35歳（介護保険なし）', () => {
    const grade = { healthStandard: 500_000, pensionStandard: 500_000 }
    const result = calculateMonthlyPremiums(grade, 35, rates)

    expect(result.employeeHealth).toBe(24_775)
    expect(result.employerHealth).toBe(24_775)
    expect(result.employeeNursing).toBe(0)
    expect(result.employerNursing).toBe(0)
    expect(result.employeePension).toBe(45_750)
    expect(result.employerPension).toBe(45_750)
    expect(result.employerChildCare).toBe(1_800)
  })

  test('790,000円・45歳（介護保険あり）', () => {
    const grade = { healthStandard: 790_000, pensionStandard: 650_000 }
    const result = calculateMonthlyPremiums(grade, 45, rates)

    // 全額を先に計算し、折半 → 端数は事業主負担
    expect(result.employeeHealth).toBe(39_144) // roundInsurancePremium(78,289 / 2)
    expect(result.employerHealth).toBe(39_145) // 78,289 - 39,144
    expect(result.employeeNursing).toBe(6_280) // roundInsurancePremium(12,561 / 2)
    expect(result.employerNursing).toBe(6_281) // 12,561 - 6,280
    expect(result.employeePension).toBe(59_475)
    expect(result.employerPension).toBe(59_475)
    expect(result.employerChildCare).toBe(2_340)
  })

  test('300,000円・40歳（介護保険あり）', () => {
    const grade = { healthStandard: 300_000, pensionStandard: 300_000 }
    const result = calculateMonthlyPremiums(grade, 40, rates)

    expect(result.employeeHealth).toBe(14_865)
    expect(result.employerHealth).toBe(14_865)
    expect(result.employeeNursing).toBe(2_385)
    expect(result.employerNursing).toBe(2_385)
    expect(result.employeePension).toBe(27_450)
    expect(result.employerPension).toBe(27_450)
    expect(result.employerChildCare).toBe(1_080)
  })

  test('介護保険: 39歳はなし', () => {
    const grade = { healthStandard: 300_000, pensionStandard: 300_000 }
    const result = calculateMonthlyPremiums(grade, 39, rates)
    expect(result.employeeNursing).toBe(0)
    expect(result.employerNursing).toBe(0)
  })

  test('介護保険: 65歳はなし', () => {
    const grade = { healthStandard: 300_000, pensionStandard: 300_000 }
    const result = calculateMonthlyPremiums(grade, 65, rates)
    expect(result.employeeNursing).toBe(0)
    expect(result.employerNursing).toBe(0)
  })

  test('介護保険: 64歳はあり', () => {
    const grade = { healthStandard: 300_000, pensionStandard: 300_000 }
    const result = calculateMonthlyPremiums(grade, 64, rates)
    expect(result.employeeNursing).toBe(2_385)
    expect(result.employerNursing).toBe(2_385)
  })
})

describe('calculateBonusPremiums', () => {
  const { rates, bonusCaps } = socialInsurance2025

  test('賞与2,000,000円・1回・45歳', () => {
    const result = calculateBonusPremiums(2_000_000, 1, 45, rates, bonusCaps)

    // standardBonus = 2,000,000
    // health: min(2,000,000, 5,730,000) = 2,000,000
    // pension: min(2,000,000, 1,500,000) = 1,500,000
    approx(result.employeeHealth, 99_100)
    approx(result.employerHealth, 99_100)
    approx(result.employeeNursing, 15_900)
    approx(result.employerNursing, 15_900)
    approx(result.employeePension, 137_250)
    approx(result.employerPension, 137_250)
    approx(result.employerChildCare, 5_400)
  })

  test('賞与6,000,000円・1回・40歳（健保年度累計上限）', () => {
    const result = calculateBonusPremiums(6_000_000, 1, 40, rates, bonusCaps)

    // standardBonus = 6,000,000
    // health: min(6,000,000, 5,730,000) = 5,730,000 (capped)
    // pension: min(6,000,000, 1,500,000) = 1,500,000
    approx(result.employeeHealth, 283_921)
    approx(result.employeeNursing, 45_553)
    approx(result.employeePension, 137_250)
  })

  test('賞与を2回に分割（各回150万円上限）', () => {
    const result = calculateBonusPremiums(4_000_000, 2, 35, rates, bonusCaps)

    // 1回あたり 2,000,000 → standardBonus = 2,000,000
    // pension各回: min(2,000,000, 1,500,000) = 1,500,000
    // pension合計: 1,500,000 * 2 = 3,000,000
    // health累計: min(2,000,000, 5,730,000) + min(2,000,000, 5,730,000-2,000,000) = 2,000,000 + 2,000,000 = 4,000,000
    approx(result.employeePension, 137_250 * 2)
  })

  test('賞与0円', () => {
    const result = calculateBonusPremiums(0, 0, 35, rates, bonusCaps)

    expect(result.employeeHealth).toBe(0)
    expect(result.employerHealth).toBe(0)
    expect(result.employeePension).toBe(0)
    expect(result.employerPension).toBe(0)
    expect(result.employerChildCare).toBe(0)
  })

  test('既存の健保累計がある場合（priorHealthCumulative）', () => {
    // 既に5,000,000の累計がある → 残り730,000
    const result = calculateBonusPremiums(2_000_000, 1, 35, rates, bonusCaps, 5_000_000)

    // standardBonus = 2,000,000
    // health: min(2,000,000, 5,730,000 - 5,000,000) = min(2,000,000, 730,000) = 730,000
    approx(result.employeeHealth, Math.round(730_000 * 0.04955))
  })
})

describe('calculateAnnualSocialInsurance', () => {
  test('Case 1: monthly=500,000, bonus=0, age=35, tokyo', () => {
    const result = calculateAnnualSocialInsurance({
      monthlyCompensation: 500_000,
      bonusAmount: 0,
      bonusCount: 0,
      age: 35,
    })

    approx(result.employeeAnnual, 846_300)
    approx(result.employerAnnual, 867_900)
  })

  test('Case 2: monthly=800,000, bonus=2,000,000, bonusCount=1, age=45', () => {
    const result = calculateAnnualSocialInsurance({
      monthlyCompensation: 800_000,
      bonusAmount: 2_000_000,
      bonusCount: 1,
      age: 45,
    })

    approx(result.employeeAnnual, 1_511_038)
    approx(result.employerAnnual, 1_544_542)
  })

  test('Case 3: monthly=300,000, bonus=6,000,000, bonusCount=1, age=40', () => {
    const result = calculateAnnualSocialInsurance({
      monthlyCompensation: 300_000,
      bonusAmount: 6_000_000,
      bonusCount: 1,
      age: 40,
    })

    approx(result.employeeAnnual, 1_003_124)
    // Health capped at 5,730,000
  })

  test('breakdown構造の検証', () => {
    const result = calculateAnnualSocialInsurance({
      monthlyCompensation: 500_000,
      bonusAmount: 0,
      bonusCount: 0,
      age: 35,
    })

    expect(result.breakdown).toBeDefined()
    expect(result.breakdown.monthly).toBeDefined()
    expect(result.breakdown.bonus).toBeDefined()
    expect(result.totalAnnual).toBe(result.employeeAnnual + result.employerAnnual)
  })
})
