/**
 * 社会保険の型定義
 *
 * 対象: 令和7年度（2025年度）協会けんぽ・東京都
 */

/** 保険料率 */
export interface InsuranceRates {
  /** 健康保険料率 (全額) */
  healthInsuranceRate: number
  /** 健康保険料率 (折半) */
  healthInsuranceRateHalf: number
  /** 介護保険料率 (全額, 40歳以上65歳未満) */
  nursingCareRate: number
  /** 介護保険料率 (折半) */
  nursingCareRateHalf: number
  /** 健康保険 + 介護保険 合計料率 (全額) */
  healthPlusNursingRate: number
  /** 健康保険 + 介護保険 合計料率 (折半) */
  healthPlusNursingRateHalf: number
  /** 厚生年金保険料率 (全額) */
  pensionRate: number
  /** 厚生年金保険料率 (折半) */
  pensionRateHalf: number
  /** 子ども・子育て拠出金率 (事業主全額負担) */
  childCareContributionRate: number
}

/** 標準報酬月額の等級 */
export interface StandardRemunerationGrade {
  /** 健康保険の等級番号 (1-50) */
  healthGrade: number
  /** 厚生年金の等級番号 (1-32), null = 厚生年金の等級範囲外 */
  pensionGrade: number | null
  /** 標準報酬月額 (円) */
  standardMonthly: number
  /** 報酬月額の下限 (円), null = 下限なし（最低等級） */
  lowerBound: number | null
  /** 報酬月額の上限 (円), null = 上限なし（最高等級） */
  upperBound: number | null
}

/** 標準賞与額の上限 */
export interface BonusCaps {
  /** 健康保険: 年度累計上限 (円) */
  healthAnnualCap: number
  /** 厚生年金: 1回あたり上限 (円) */
  pensionPerPaymentCap: number
}

/** 厚生年金の等級範囲 */
export interface PensionGradeRange {
  /** 最低標準報酬月額 (円) */
  minStandardMonthly: number
  /** 最高標準報酬月額 (円) */
  maxStandardMonthly: number
  /** 最低等級 */
  minGrade: number
  /** 最高等級 */
  maxGrade: number
}

/** 社会保険設定全体 */
export interface SocialInsuranceConfig {
  /** 対象年度 */
  fiscalYear: string
  /** 都道府県 */
  prefecture: string
  /** 保険料率 */
  rates: InsuranceRates
  /** 標準報酬月額 全等級テーブル (50等級) */
  grades: StandardRemunerationGrade[]
  /** 標準賞与額の上限 */
  bonusCaps: BonusCaps
  /** 厚生年金の等級範囲 */
  pensionGradeRange: PensionGradeRange
}
