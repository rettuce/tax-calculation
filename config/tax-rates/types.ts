/**
 * 所得税・住民税の型定義
 *
 * 対象: 令和7年分（2025年）所得税 / 令和8年度（2026年度）住民税
 */

/** 所得税の累進課税ブラケット */
export interface IncomeTaxBracket {
  /** 課税所得の下限 (円) */
  min: number
  /** 課税所得の上限 (円, inclusive) */
  max: number
  /** 税率 (小数) */
  rate: number
  /** 控除額 (円) */
  deduction: number
}

/** 給与所得控除ブラケット */
export interface EmploymentIncomeDeductionBracket {
  /** 給与収入の下限 (円) */
  min: number
  /** 給与収入の上限 (円) */
  max: number
  /** 定額の場合の金額、またはnull */
  fixedAmount: number | null
  /** 収入に掛ける割合 */
  rate: number
  /** 加算額 */
  addition: number
}

/** 基礎控除ブラケット */
export interface BasicDeductionBracket {
  /** 合計所得金額の上限 (円) */
  maxIncome: number
  /** 所得税の控除額 (円) */
  incomeTaxDeduction: number
  /** 住民税の控除額 (円) */
  residentTaxDeduction: number
}

/** 配偶者控除エントリ */
export interface SpouseDeductionEntry {
  /** 本人の合計所得の上限 (円) */
  maxOwnerIncome: number
  /** 一般配偶者の控除額 (所得税, 円) */
  incomeTaxGeneral: number
  /** 老人配偶者の控除額 (所得税, 円) */
  incomeTaxElderly: number
  /** 一般配偶者の控除額 (住民税, 円) */
  residentTaxGeneral: number
  /** 老人配偶者の控除額 (住民税, 円) */
  residentTaxElderly: number
}

/** 配偶者特別控除エントリ */
export interface SpouseSpecialDeductionEntry {
  /** 配偶者の所得下限 (円, exclusive) */
  minSpouseIncome: number
  /** 配偶者の所得上限 (円, inclusive) */
  maxSpouseIncome: number
  /** [所得税] 本人所得900万以下, 950万以下, 1000万以下 */
  incomeTax: [number, number, number]
  /** [住民税] 本人所得900万以下, 950万以下, 1000万以下 */
  residentTax: [number, number, number]
}

/** 扶養親族の種類 */
export type DependentType =
  | 'general'          // 一般 (16~18歳, 23~69歳)
  | 'specific'         // 特定 (19~22歳)
  | 'elderly'          // 老人 (70歳以上, 非同居)
  | 'elderlyCoResident' // 老人 (70歳以上, 同居)

/** 扶養控除エントリ */
export interface DependentDeduction {
  type: DependentType
  label: string
  ageRange: string
  /** 所得税の控除額 (円) */
  incomeTaxDeduction: number
  /** 住民税の控除額 (円) */
  residentTaxDeduction: number
}

/** 住民税定数 */
export interface ResidentTaxConstants {
  /** 特別区民税率 */
  wardRate: number
  /** 都民税率 */
  metroRate: number
  /** 合計所得割率 */
  totalRate: number
  /** 特別区民税均等割 (円) */
  perCapitaWard: number
  /** 都民税均等割 (円) */
  perCapitaMetro: number
  /** 森林環境税 (円) */
  forestEnvironmentTax: number
  /** 均等割合計 (円) */
  perCapitaTotal: number
}

/** 税率設定全体 */
export interface TaxRateConfig {
  /** 対象年度（所得税の帰属年） */
  fiscalYear: string
  /** 所得税累進課税テーブル */
  incomeTaxBrackets: IncomeTaxBracket[]
  /** 復興特別所得税率 */
  reconstructionTaxRate: number
  /** 給与所得控除テーブル */
  employmentIncomeDeductionBrackets: EmploymentIncomeDeductionBracket[]
  /** 基礎控除テーブル */
  basicDeductionBrackets: BasicDeductionBracket[]
  /** 配偶者控除テーブル */
  spouseDeduction: SpouseDeductionEntry[]
  /** 配偶者特別控除テーブル */
  spouseSpecialDeduction: SpouseSpecialDeductionEntry[]
  /** 扶養控除テーブル */
  dependentDeductions: DependentDeduction[]
  /** 住民税定数 */
  residentTax: ResidentTaxConstants
  /** 生命保険料控除上限（所得税） */
  lifeInsuranceMaxTotal: number
  /** 生命保険料控除上限（住民税） */
  lifeInsuranceResidentMaxTotal: number
  /** 医療費控除しきい値 (円) */
  medicalExpenseThreshold: number
  /** 医療費控除上限 (円) */
  medicalExpenseMaxDeduction: number
}
