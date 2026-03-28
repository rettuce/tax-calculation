/**
 * 法人税の型定義
 *
 * 対象: 資本金1億円以下の中小法人（東京都特別区）
 */

/** 法人税ブラケット（国税） */
export interface CorporateTaxBracket {
  /** 所得の上限 (円, inclusive)。Infinity = 上限なし */
  maxIncome: number
  /** 税率 (小数) */
  rate: number
}

/** 法人住民税（法人都民税・法人税割） */
export interface CorporateInhabitantTaxRates {
  /** 標準税率 (資本金1億円以下 かつ 法人税額年1,000万円以下) */
  standardRate: number
  /** 超過税率 */
  excessRate: number
}

/** 法人事業税ブラケット（所得割） */
export interface BusinessTaxBracket {
  /** 所得の上限 (円, inclusive) */
  maxIncome: number
  /** 標準税率 */
  standardRate: number
  /** 超過税率 */
  excessRate: number
}

/** 法人都民税 均等割 */
export interface CorporateFlatRate {
  /** 年額 (円) */
  annualAmount: number
  /** 適用条件 */
  condition: string
}

/** 防衛特別法人税（令和8年4月1日以後開始事業年度から適用） */
export interface DefenseSpecialTax {
  /** 税率 (小数) */
  rate: number
  /** 基礎控除額 (円) */
  baseDeduction: number
  /** 適用開始日 */
  effectiveFrom: string
}

/** 法人税設定全体 */
export interface CorporateTaxConfig {
  /** 対象年度 */
  fiscalYear: string
  /** 法人税（国税）ブラケット */
  corporateTaxBrackets: CorporateTaxBracket[]
  /** 地方法人税率 */
  localCorporateTaxRate: number
  /** 法人住民税（法人都民税・法人税割） */
  inhabitantTax: CorporateInhabitantTaxRates
  /** 法人事業税（所得割）ブラケット */
  businessTaxBrackets: BusinessTaxBracket[]
  /** 特別法人事業税率 (課税標準: 標準税率で計算した事業税所得割額) */
  specialBusinessTaxRate: number
  /** 均等割 */
  flatRate: CorporateFlatRate
  /** 防衛特別法人税（将来適用） */
  defenseSpecialTax: DefenseSpecialTax
}
