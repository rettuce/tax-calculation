/**
 * 社会保険料計算 — Pure functions (Vue非依存)
 *
 * 協会けんぽ・厚生年金の月額保険料・賞与保険料・年間保険料を計算する。
 * 端数処理は全て utils/rounding.ts の関数を経由する。
 */

import type {
  StandardRemunerationGrade,
  InsuranceRates,
  BonusCaps,
} from '~/config/social-insurance/types'
import { socialInsurance2025 } from '~/config/social-insurance'
import { applyRate, roundInsurancePremium, roundStandardBonus } from '~/utils/rounding'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GradeResult {
  healthStandard: number
  pensionStandard: number
}

export interface MonthlyPremiums {
  employeeHealth: number
  employerHealth: number
  employeeNursing: number
  employerNursing: number
  employeePension: number
  employerPension: number
  employerChildCare: number
}

export interface BonusPremiums {
  employeeHealth: number
  employerHealth: number
  employeeNursing: number
  employerNursing: number
  employeePension: number
  employerPension: number
  employerChildCare: number
}

export interface AnnualSocialInsuranceInput {
  monthlyCompensation: number
  bonusAmount: number
  bonusCount: number
  age: number
  /** 都道府県（将来の拡張用、現在は東京のみ） */
  prefecture?: string
}

export interface AnnualSocialInsuranceResult {
  employeeAnnual: number
  employerAnnual: number
  totalAnnual: number
  breakdown: {
    monthly: MonthlyPremiums
    bonus: BonusPremiums
  }
}

// ---------------------------------------------------------------------------
// 1. findStandardRemunerationGrade
// ---------------------------------------------------------------------------

/**
 * 報酬月額から標準報酬月額の等級を検索する（二分探索）
 *
 * - 健康保険: 第1級(58,000) ~ 第50級(1,390,000)
 * - 厚生年金: 第1級(88,000) ~ 第32級(650,000)
 *   - 健保1-3級（pensionGrade=null, healthGrade<=3）→ 年金は88,000
 *   - 健保36-50級（pensionGrade=null, healthGrade>=36）→ 年金は650,000
 */
export function findStandardRemunerationGrade(
  monthlyRemuneration: number,
  grades: StandardRemunerationGrade[],
): GradeResult {
  const grade = binarySearchGrade(monthlyRemuneration, grades)

  const healthStandard = grade.standardMonthly

  let pensionStandard: number
  if (grade.pensionGrade !== null) {
    pensionStandard = grade.standardMonthly
  } else if (grade.healthGrade <= 3) {
    pensionStandard = 88_000
  } else {
    pensionStandard = 650_000
  }

  return { healthStandard, pensionStandard }
}

/**
 * 二分探索で該当する等級を見つける。
 * upperBound は「未満」の意味。lowerBound 以上 upperBound 未満の範囲に入る等級を返す。
 */
function binarySearchGrade(
  remuneration: number,
  grades: StandardRemunerationGrade[],
): StandardRemunerationGrade {
  let low = 0
  let high = grades.length - 1

  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    const grade = grades[mid]

    if (grade.upperBound !== null && remuneration >= grade.upperBound) {
      low = mid + 1
    } else {
      high = mid
    }
  }

  return grades[low]
}

// ---------------------------------------------------------------------------
// 2. calculateMonthlyPremiums
// ---------------------------------------------------------------------------

/**
 * 月額保険料を計算する。
 *
 * 折半ロジック: 全額を先に計算 → 被保険者分 = roundInsurancePremium(全額 / 2) → 事業主分 = 全額 - 被保険者分
 * これにより端数は事業主側に寄せられる（協会けんぽの標準方式）。
 */
export function calculateMonthlyPremiums(
  grade: GradeResult,
  age: number,
  rates: InsuranceRates,
): MonthlyPremiums {
  const isNursingTarget = age >= 40 && age < 65

  // 健康保険
  const totalHealth = applyRate(grade.healthStandard, rates.healthInsuranceRate, 'insurance')
  const employeeHealth = roundInsurancePremium(totalHealth / 2)
  const employerHealth = totalHealth - employeeHealth

  // 介護保険
  let employeeNursing = 0
  let employerNursing = 0
  if (isNursingTarget) {
    const totalNursing = applyRate(grade.healthStandard, rates.nursingCareRate, 'insurance')
    employeeNursing = roundInsurancePremium(totalNursing / 2)
    employerNursing = totalNursing - employeeNursing
  }

  // 厚生年金
  const totalPension = applyRate(grade.pensionStandard, rates.pensionRate, 'insurance')
  const employeePension = roundInsurancePremium(totalPension / 2)
  const employerPension = totalPension - employeePension

  // 子ども・子育て拠出金（事業主全額負担）
  const employerChildCare = applyRate(grade.pensionStandard, rates.childCareContributionRate, 'floor')

  return {
    employeeHealth,
    employerHealth,
    employeeNursing,
    employerNursing,
    employeePension,
    employerPension,
    employerChildCare,
  }
}

// ---------------------------------------------------------------------------
// 3. calculateBonusPremiums
// ---------------------------------------------------------------------------

/**
 * 賞与保険料を計算する。
 *
 * - 各回の支払額に対して標準賞与額（1,000円未満切捨て）を算出
 * - 健康保険: 年度累計573万円上限
 * - 厚生年金: 1回あたり150万円上限
 */
export function calculateBonusPremiums(
  bonusAmount: number,
  bonusCount: number,
  age: number,
  rates: InsuranceRates,
  bonusCaps: BonusCaps,
  priorHealthCumulative: number = 0,
): BonusPremiums {
  if (bonusAmount <= 0 || bonusCount <= 0) {
    return {
      employeeHealth: 0,
      employerHealth: 0,
      employeeNursing: 0,
      employerNursing: 0,
      employeePension: 0,
      employerPension: 0,
      employerChildCare: 0,
    }
  }

  const isNursingTarget = age >= 40 && age < 65
  const perPayment = bonusAmount / bonusCount

  let totalEmployeeHealth = 0
  let totalEmployerHealth = 0
  let totalEmployeeNursing = 0
  let totalEmployerNursing = 0
  let totalEmployeePension = 0
  let totalEmployerPension = 0
  let totalEmployerChildCare = 0

  let healthCumulative = priorHealthCumulative

  for (let i = 0; i < bonusCount; i++) {
    const standardBonus = roundStandardBonus(perPayment)

    // 健康保険: 年度累計上限
    const healthRemaining = Math.max(0, bonusCaps.healthAnnualCap - healthCumulative)
    const healthBase = Math.min(standardBonus, healthRemaining)
    healthCumulative += healthBase

    // 厚生年金: 1回あたり上限
    const pensionBase = Math.min(standardBonus, bonusCaps.pensionPerPaymentCap)

    // 健康保険
    const totalHealth = applyRate(healthBase, rates.healthInsuranceRate, 'insurance')
    const empHealth = roundInsurancePremium(totalHealth / 2)
    totalEmployeeHealth += empHealth
    totalEmployerHealth += totalHealth - empHealth

    // 介護保険
    if (isNursingTarget) {
      const totalNursing = applyRate(healthBase, rates.nursingCareRate, 'insurance')
      const empNursing = roundInsurancePremium(totalNursing / 2)
      totalEmployeeNursing += empNursing
      totalEmployerNursing += totalNursing - empNursing
    }

    // 厚生年金
    const totalPension = applyRate(pensionBase, rates.pensionRate, 'insurance')
    const empPension = roundInsurancePremium(totalPension / 2)
    totalEmployeePension += empPension
    totalEmployerPension += totalPension - empPension

    // 子ども・子育て拠出金
    totalEmployerChildCare += applyRate(pensionBase, rates.childCareContributionRate, 'floor')
  }

  return {
    employeeHealth: totalEmployeeHealth,
    employerHealth: totalEmployerHealth,
    employeeNursing: totalEmployeeNursing,
    employerNursing: totalEmployerNursing,
    employeePension: totalEmployeePension,
    employerPension: totalEmployerPension,
    employerChildCare: totalEmployerChildCare,
  }
}

// ---------------------------------------------------------------------------
// 4. calculateAnnualSocialInsurance
// ---------------------------------------------------------------------------

/**
 * 年間社会保険料を計算する（月額 x 12 + 賞与）
 */
export function calculateAnnualSocialInsurance(
  input: AnnualSocialInsuranceInput,
): AnnualSocialInsuranceResult {
  const config = socialInsurance2025
  const { rates, grades, bonusCaps } = config

  // 等級検索
  const grade = findStandardRemunerationGrade(input.monthlyCompensation, grades)

  // 月額保険料
  const monthly = calculateMonthlyPremiums(grade, input.age, rates)

  // 賞与保険料
  const bonus = calculateBonusPremiums(
    input.bonusAmount,
    input.bonusCount,
    input.age,
    rates,
    bonusCaps,
  )

  // 年間集計
  const monthlyEmployeeTotal =
    monthly.employeeHealth + monthly.employeeNursing + monthly.employeePension
  const monthlyEmployerTotal =
    monthly.employerHealth + monthly.employerNursing + monthly.employerPension + monthly.employerChildCare

  const bonusEmployeeTotal =
    bonus.employeeHealth + bonus.employeeNursing + bonus.employeePension
  const bonusEmployerTotal =
    bonus.employerHealth + bonus.employerNursing + bonus.employerPension + bonus.employerChildCare

  const employeeAnnual = monthlyEmployeeTotal * 12 + bonusEmployeeTotal
  const employerAnnual = monthlyEmployerTotal * 12 + bonusEmployerTotal

  return {
    employeeAnnual,
    employerAnnual,
    totalAnnual: employeeAnnual + employerAnnual,
    breakdown: { monthly, bonus },
  }
}
