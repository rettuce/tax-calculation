/**
 * 令和7年度（2025年度）法人税データ
 *
 * 対象: 資本金1億円以下の中小法人（東京都特別区）
 *
 * 出典:
 * - 国税庁 No.5759 法人税の税率
 * - 東京都主税局 法人事業税・法人都民税 税率表
 * - 国税庁 地方法人税の税率
 * - 東京都主税局 特別法人事業税
 * - 財務省 令和7年度税制改正の大綱（防衛特別法人税）
 */

import type { CorporateTaxConfig } from './types'

export const corporateTax2025 = {
  fiscalYear: '2025',

  /**
   * 法人税（国税）
   * 中小法人の軽減税率: 800万円以下 15%, 800万円超 23.2%
   */
  corporateTaxBrackets: [
    { maxIncome: 8_000_000, rate: 0.15 },
    { maxIncome: Infinity, rate: 0.232 },
  ],

  /** 地方法人税率: 10.3% (令和元年10月1日以後開始事業年度から) */
  localCorporateTaxRate: 0.103,

  /**
   * 法人住民税（法人都民税・法人税割）
   * 東京都23区: 都道府県民税分と市町村民税分を合算
   */
  inhabitantTax: {
    standardRate: 0.07,
    excessRate: 0.104,
  },

  /**
   * 法人事業税（所得割）
   * 東京都・1号普通法人（令和4年4月1日以後開始事業年度）
   * 標準税率: 資本金1億円以下の中小法人
   */
  businessTaxBrackets: [
    { maxIncome: 4_000_000, standardRate: 0.035, excessRate: 0.0375 },
    { maxIncome: 8_000_000, standardRate: 0.053, excessRate: 0.05665 },
    { maxIncome: Infinity, standardRate: 0.07, excessRate: 0.0748 },
  ],

  /**
   * 特別法人事業税: 37%
   * 課税標準は「標準税率」で計算した事業税所得割額
   * 超過税率適用法人でも標準税率で計算し直す
   */
  specialBusinessTaxRate: 0.37,

  /**
   * 均等割（法人都民税）
   * 資本金1,000万円以下・従業員50人以下: 年7万円
   */
  flatRate: {
    annualAmount: 70_000,
    condition: '資本金1,000万円以下・従業員50人以下',
  },

  /**
   * 防衛特別法人税（新設予定）
   * 法人税額への付加税4%、基礎控除500万円
   * 令和8年4月1日以後開始事業年度から適用
   */
  defenseSpecialTax: {
    rate: 0.04,
    baseDeduction: 5_000_000,
    effectiveFrom: '2026-04-01',
  },
} satisfies CorporateTaxConfig
