/**
 * 最適化アルゴリズム
 *
 * calculateAll: 全計算パイプラインの統合エントリポイント
 * optimize: 2段階ブルートフォース探索で最適な報酬配分を求める
 */

import { calculateAnnualSocialInsurance } from '~/utils/social-insurance-calculator'
import type { AnnualSocialInsuranceResult } from '~/utils/social-insurance-calculator'
import { calculateEmploymentIncome } from '~/utils/income-tax-calculator'
import { calculateTotalIncomeTax } from '~/utils/income-tax-calculator'
import { calculateAdjustmentDeduction, calculateResidentTax } from '~/utils/resident-tax-calculator'
import { calculateCorporateTaxes } from '~/utils/corporate-tax-calculator'
import type { CorporateProfile } from '~/utils/corporate-tax-calculator'
import { calculateAllDeductions } from '~/utils/deduction-calculator'
import type { DependentInput } from '~/utils/deduction-calculator'
import { roundTaxableIncome } from '~/utils/rounding'
import { taxRates2025 } from '~/config/tax-rates/2025'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** ユーザーが設定する控除オプション */
export interface DeductionSettings {
  /** 23歳未満の扶養親族 or 特別障害者の有無 */
  hasYoungDependent: boolean
  /** 配偶者の合計所得金額（undefined = 配偶者なし） */
  spouseIncome?: number
  /** 扶養親族 */
  dependents?: DependentInput[]
  /** 生命保険料の合計支払額 */
  lifeInsurancePremium?: number
  /** 小規模企業共済等掛金 (所得税・住民税共通で全額控除) */
  smallBusinessMutualAid?: number
  /** iDeCo 掛金 (所得税・住民税共通で全額控除) */
  ideco?: number
  /** 医療費（支払総額） */
  medicalExpense?: number
  /** 経営セーフティ共済 掛金（法人損金、年額上限240万円） */
  safetyMutualAid?: number
  /** その他控除（所得税用） */
  otherDeductionIncomeTax?: number
  /** その他控除（住民税用） */
  otherDeductionResidentTax?: number
}

export interface CalculationInput {
  /** 利益総額（報酬・社保控除前） */
  totalProfit: number
  /** 月額定期同額給与 */
  monthlyCompensation: number
  /** 事前確定届出給与（年額） */
  bonusAmount: number
  /** 支給回数 */
  bonusCount: 1 | 2 | 3
  /** 年齢 */
  age: number
  /** 都道府県 */
  prefecture: string
  /** 控除設定 */
  deductions: DeductionSettings
}

export interface CalculationResult {
  // Input echo
  annualCompensation: number
  monthlyCompensation: number
  bonusAmount: number

  // Social insurance
  socialInsurance: {
    employeeAnnual: number
    employerAnnual: number
    totalAnnual: number
  }

  // Personal tax
  employmentIncome: number
  incomeTaxDeductions: number
  residentTaxDeductions: number
  incomeTaxableIncome: number
  residentTaxableIncome: number
  incomeTax: number
  residentTax: number
  personalNetIncome: number

  // Corporate
  corporateIncome: number
  corporateTaxTotal: number
  corporateRetained: number

  // Summary
  /** personalNetIncome + corporateRetained */
  totalNetIncome: number
  totalTax: number
  totalSocialInsurance: number
  effectiveTaxRate: number
}

export type OptimizationGoal =
  | 'maxNetIncome'
  | 'maxTotalRetained'
  | 'minSocialInsurance'

export interface OptimizationInput {
  totalProfit: number
  age: number
  prefecture: string
  goal: OptimizationGoal
  deductions: DeductionSettings
  /** 月額定期同額給与の下限（円） */
  minMonthlyCompensation?: number
}

export interface OptimizationResult extends CalculationResult {
  /** 最適化の根拠を示す1行説明 */
  reason: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** デフォルトの法人プロフィール（一人社長の小規模法人） */
const DEFAULT_PROFILE: CorporateProfile = {
  capital: 10_000_000, // 資本金1,000万円
  employees: 1,
}

/** 人的控除の所得税・住民税差額（基礎控除のみの場合） */
const BASIC_DEDUCTION_DIFFERENCE = 50_000

// ---------------------------------------------------------------------------
// calculateAll
// ---------------------------------------------------------------------------

/**
 * 全計算パイプラインを一括実行する
 *
 * 1. 年間報酬 = 月額 x 12 + 賞与
 * 2. 社会保険料計算
 * 3. 給与所得計算
 * 4. 各種控除計算
 * 5. 課税所得計算
 * 6. 所得税計算
 * 7. 住民税計算
 * 8. 個人手取り = 報酬 - 社保本人分 - 所得税 - 住民税
 * 9. 法人所得 = 利益総額 - 報酬 - 社保事業主分
 * 10. 法人税等計算
 * 11. 法人内部留保 = 法人所得 - 法人税等
 * 12. 総合手取り = 個人手取り + 法人内部留保
 */
export function calculateAll(input: CalculationInput): CalculationResult {
  const {
    totalProfit,
    monthlyCompensation,
    bonusAmount,
    bonusCount,
    age,
    deductions,
  } = input

  // Step 1: 年間報酬
  const annualCompensation = monthlyCompensation * 12 + bonusAmount

  // Step 2: 社会保険料
  const si = calculateAnnualSocialInsurance({
    monthlyCompensation,
    bonusAmount,
    bonusCount,
    age,
  })

  // Step 3: 給与所得
  const employmentIncome = calculateEmploymentIncome(annualCompensation)

  // Step 4: 各種控除
  // 社保本人分 + 小規模企業共済 + iDeCo は所得控除として加算
  const additionalSocialDeduction =
    (deductions.smallBusinessMutualAid ?? 0) + (deductions.ideco ?? 0)

  const allDeductions = calculateAllDeductions({
    totalIncome: employmentIncome,
    grossIncome: annualCompensation,
    hasYoungDependent: deductions.hasYoungDependent,
    spouseIncome: deductions.spouseIncome,
    dependents: deductions.dependents,
    lifeInsurancePremium: deductions.lifeInsurancePremium,
  })

  // 所得税控除合計 = deduction-calculator の合計 + 社保本人分 + 追加控除
  const incomeTaxDeductions =
    allDeductions.incomeTaxTotal +
    si.employeeAnnual +
    additionalSocialDeduction +
    (deductions.otherDeductionIncomeTax ?? 0)

  // 住民税控除合計 = deduction-calculator の合計 + 社保本人分 + 追加控除
  // 医療費控除は住民税にも適用
  let medicalDeductionForResident = 0
  if (deductions.medicalExpense && deductions.medicalExpense > 100_000) {
    medicalDeductionForResident = Math.min(
      deductions.medicalExpense - 100_000,
      2_000_000,
    )
  }

  const residentTaxDeductions =
    allDeductions.residentTaxTotal +
    si.employeeAnnual +
    additionalSocialDeduction +
    medicalDeductionForResident +
    (deductions.otherDeductionResidentTax ?? 0)

  // Step 5: 課税所得（1,000円未満切捨て）
  const incomeTaxableIncome = roundTaxableIncome(
    employmentIncome - incomeTaxDeductions,
  )
  const residentTaxableIncome = roundTaxableIncome(
    employmentIncome - residentTaxDeductions,
  )

  // Step 6: 所得税（復興特別所得税込み、100円未満切捨て）
  const incomeTax = calculateTotalIncomeTax(incomeTaxableIncome)

  // Step 7: 住民税
  // 人的控除差額を計算（扶養控除等の差額を含む）
  let personalDeductionDifference = BASIC_DEDUCTION_DIFFERENCE
  if (deductions.dependents) {
    for (const dep of deductions.dependents) {
      const entry = taxRates2025.dependentDeductions.find(
        (d) => d.type === dep.type,
      )
      if (entry) {
        personalDeductionDifference +=
          (entry.incomeTaxDeduction - entry.residentTaxDeduction) * dep.count
      }
    }
  }
  if (deductions.spouseIncome !== undefined && deductions.spouseIncome <= 580_000) {
    // 配偶者控除の差額: 所得税38万 - 住民税33万 = 5万
    personalDeductionDifference += 50_000
  }

  const adjustmentDeduction = calculateAdjustmentDeduction(
    residentTaxableIncome,
    employmentIncome,
    personalDeductionDifference,
  )
  const residentTaxResult = calculateResidentTax(
    residentTaxableIncome,
    adjustmentDeduction,
  )
  const residentTax = residentTaxResult.total

  // Step 8: 個人手取り
  const personalNetIncome =
    annualCompensation - si.employeeAnnual - incomeTax - residentTax

  // Step 9: 法人所得（セーフティ共済は法人損金）
  const safetyMutualAid = deductions.safetyMutualAid ?? 0
  const corporateIncome =
    totalProfit - annualCompensation - si.employerAnnual - safetyMutualAid

  // Step 10: 法人税等
  const corpTax = calculateCorporateTaxes(corporateIncome, DEFAULT_PROFILE)

  // Step 11: 法人内部留保
  const corporateRetained = corporateIncome - corpTax.totalTax

  // Step 12: 総合手取り
  const totalNetIncome = personalNetIncome + corporateRetained

  // 税負担合計
  const totalTax = incomeTax + residentTax + corpTax.totalTax
  const totalSocialInsurance = si.totalAnnual

  // 実効税率
  const effectiveTaxRate =
    totalProfit > 0
      ? (totalTax + totalSocialInsurance) / totalProfit
      : 0

  return {
    annualCompensation,
    monthlyCompensation,
    bonusAmount,
    socialInsurance: {
      employeeAnnual: si.employeeAnnual,
      employerAnnual: si.employerAnnual,
      totalAnnual: si.totalAnnual,
    },
    employmentIncome,
    incomeTaxDeductions,
    residentTaxDeductions,
    incomeTaxableIncome,
    residentTaxableIncome,
    incomeTax,
    residentTax,
    personalNetIncome,
    corporateIncome,
    corporateTaxTotal: corpTax.totalTax,
    corporateRetained,
    totalNetIncome,
    totalTax,
    totalSocialInsurance,
    effectiveTaxRate,
  }
}

// ---------------------------------------------------------------------------
// optimize
// ---------------------------------------------------------------------------

/** ゴール関数: 値が大きいほど良い（minの場合は負にする） */
function goalValue(result: CalculationResult, goal: OptimizationGoal): number {
  switch (goal) {
    case 'maxNetIncome':
      return result.personalNetIncome
    case 'maxTotalRetained':
      return result.totalNetIncome
    case 'minSocialInsurance':
      return -result.socialInsurance.totalAnnual
  }
}

/** 探索空間の制約チェック */
function isValidCompensation(
  monthly: number,
  bonus: number,
  totalProfit: number,
): boolean {
  // 報酬 + 概算社保事業主分（約15%）が利益を超えないこと
  const annualComp = monthly * 12 + bonus
  const estimatedEmployerSI = annualComp * 0.15
  return annualComp + estimatedEmployerSI < totalProfit && annualComp >= 0
}

interface SearchCandidate {
  monthly: number
  bonus: number
  bonusCount: 1 | 2 | 3
  score: number
  result: CalculationResult
}

/**
 * 2段階ブルートフォース探索で最適な報酬配分を求める
 *
 * Phase 1 (粗探索): 月額0〜上限を10,000円刻み、賞与0〜残余を100,000円刻み
 * Phase 2 (精密探索): 上位5候補の周辺を月額1,000円刻み、賞与10,000円刻みで再探索
 */
export function optimize(input: OptimizationInput): OptimizationResult {
  const { totalProfit, age, prefecture, goal, deductions } = input
  const minMonthly = input.minMonthlyCompensation ?? 0

  const maxMonthly = Math.min(Math.floor(totalProfit / 12), 2_000_000)
  const bonusCounts: (1 | 2 | 3)[] = [1, 2, 3]

  // Phase 1: 粗探索
  const candidates: SearchCandidate[] = []

  for (let monthly = minMonthly; monthly <= maxMonthly; monthly += 10_000) {
    for (const bonusCount of bonusCounts) {
      const maxBonus = totalProfit - monthly * 12
      for (let bonus = 0; bonus <= maxBonus; bonus += 100_000) {
        if (!isValidCompensation(monthly, bonus, totalProfit)) continue

        const result = calculateAll({
          totalProfit,
          monthlyCompensation: monthly,
          bonusAmount: bonus,
          bonusCount,
          age,
          prefecture,
          deductions,
        })

        candidates.push({
          monthly,
          bonus,
          bonusCount,
          score: goalValue(result, goal),
          result,
        })
      }
    }
  }

  // 上位5候補を選出
  candidates.sort((a, b) => b.score - a.score)
  const top5 = candidates.slice(0, 5)

  // Phase 2: 精密探索
  let best: SearchCandidate | null = null

  for (const candidate of top5) {
    const monthlyLow = Math.max(minMonthly, candidate.monthly - 100_000)
    const monthlyHigh = Math.min(maxMonthly, candidate.monthly + 100_000)
    const bonusLow = Math.max(0, candidate.bonus - 100_000)
    const bonusHigh = candidate.bonus + 100_000

    for (let monthly = monthlyLow; monthly <= monthlyHigh; monthly += 1_000) {
      for (let bonus = bonusLow; bonus <= bonusHigh; bonus += 10_000) {
        if (!isValidCompensation(monthly, bonus, totalProfit)) continue

        const result = calculateAll({
          totalProfit,
          monthlyCompensation: monthly,
          bonusAmount: bonus,
          bonusCount: candidate.bonusCount,
          age,
          prefecture,
          deductions,
        })

        const score = goalValue(result, goal)
        if (!best || score > best.score) {
          best = {
            monthly,
            bonus,
            bonusCount: candidate.bonusCount,
            score,
            result,
          }
        }
      }
    }
  }

  // フォールバック: 候補が見つからない場合（totalProfitが極小など）
  if (!best) {
    const fallbackResult = calculateAll({
      totalProfit,
      monthlyCompensation: minMonthly,
      bonusAmount: 0,
      bonusCount: 1,
      age,
      prefecture,
      deductions,
    })
    return {
      ...fallbackResult,
      reason: minMonthly > 0
        ? `月額下限${Math.round(minMonthly / 10_000)}万円の制約内で最適化しました`
        : '利益が小さいため、役員報酬0が最適です',
    }
  }

  const reason = generateReason(best, goal)

  return {
    ...best.result,
    reason,
  }
}

// ---------------------------------------------------------------------------
// Reason generation
// ---------------------------------------------------------------------------

/** 所得税ブラケット境界の情報を返す */
function findBracketInfo(taxableIncome: number): { rate: number; maxIncome: number } | null {
  const brackets = taxRates2025.incomeTaxBrackets
  const bracket = brackets.find(
    (b) => taxableIncome >= b.min && taxableIncome <= b.max,
  )
  return bracket ? { rate: bracket.rate, maxIncome: bracket.max } : null
}

function generateReason(
  candidate: SearchCandidate,
  goal: OptimizationGoal,
): string {
  const monthlyMan = Math.round(candidate.monthly / 10_000)
  const bracketInfo = findBracketInfo(candidate.result.incomeTaxableIncome)
  const bracketPercent = bracketInfo ? `${(bracketInfo.rate * 100).toFixed(0)}%` : '不明'

  switch (goal) {
    case 'maxNetIncome':
      return `月額${monthlyMan}万円で所得税${bracketPercent}ブラケット内に収まり、個人手取りが最大化されます`
    case 'maxTotalRetained':
      return `月額${monthlyMan}万円で所得税${bracketPercent}ブラケットと法人税の軽減税率のバランスにより、総合手取りが最大化されます`
    case 'minSocialInsurance':
      return `月額${monthlyMan}万円で社会保険料が最小化されます（標準報酬月額の等級を最適化）`
  }
}
