/**
 * 令和7年分（2025年）所得税 / 令和8年度（2026年度）住民税 税率データ
 *
 * 出典:
 * - 国税庁 No.2260 所得税の税率 (令和7年4月1日現在法令等)
 * - 国税庁 No.1410 給与所得控除 (令和7年分以降)
 * - 国税庁 No.1199 基礎控除 (令和7年4月1日現在法令等)
 * - 国税庁 No.1191 配偶者控除 / No.1195 配偶者特別控除
 * - 国税庁 No.1180 扶養控除
 * - 東京都主税局 個人住民税
 */

import type { TaxRateConfig } from './types'

export const taxRates2025 = {
  fiscalYear: '2025',

  /**
   * 所得税速算表 (令和7年分)
   * 計算式: 課税所得金額 x 税率 - 控除額
   * ※ 課税所得金額は1,000円未満の端数切り捨て
   */
  incomeTaxBrackets: [
    { min: 1_000, max: 1_949_000, rate: 0.05, deduction: 0 },
    { min: 1_950_000, max: 3_299_000, rate: 0.10, deduction: 97_500 },
    { min: 3_300_000, max: 6_949_000, rate: 0.20, deduction: 427_500 },
    { min: 6_950_000, max: 8_999_000, rate: 0.23, deduction: 636_000 },
    { min: 9_000_000, max: 17_999_000, rate: 0.33, deduction: 1_536_000 },
    { min: 18_000_000, max: 39_999_000, rate: 0.40, deduction: 2_796_000 },
    { min: 40_000_000, max: Infinity, rate: 0.45, deduction: 4_796_000 },
  ],

  /** 復興特別所得税率: 所得税額 x 2.1% (2013年~2037年) */
  reconstructionTaxRate: 0.021,

  /**
   * 給与所得控除テーブル (令和7年分以降)
   * 改正点: 最低保障額が55万円 -> 65万円に引き上げ
   */
  employmentIncomeDeductionBrackets: [
    { min: 0, max: 1_900_000, fixedAmount: 650_000, rate: 0, addition: 0 },
    { min: 1_900_001, max: 3_600_000, fixedAmount: null, rate: 0.30, addition: 80_000 },
    { min: 3_600_001, max: 6_600_000, fixedAmount: null, rate: 0.20, addition: 440_000 },
    { min: 6_600_001, max: 8_500_000, fixedAmount: null, rate: 0.10, addition: 1_100_000 },
    { min: 8_500_001, max: Infinity, fixedAmount: 1_950_000, rate: 0, addition: 0 },
  ],

  /**
   * 基礎控除テーブル (令和7年・令和8年分)
   * 令和7年度税制改正により大幅引き上げ
   * 合計所得2,500万円超は適用なし
   */
  basicDeductionBrackets: [
    { maxIncome: 1_320_000, incomeTaxDeduction: 950_000, residentTaxDeduction: 430_000 },
    { maxIncome: 3_360_000, incomeTaxDeduction: 880_000, residentTaxDeduction: 430_000 },
    { maxIncome: 4_890_000, incomeTaxDeduction: 680_000, residentTaxDeduction: 430_000 },
    { maxIncome: 6_550_000, incomeTaxDeduction: 630_000, residentTaxDeduction: 430_000 },
    { maxIncome: 23_500_000, incomeTaxDeduction: 580_000, residentTaxDeduction: 430_000 },
    { maxIncome: 24_000_000, incomeTaxDeduction: 480_000, residentTaxDeduction: 290_000 },
    { maxIncome: 24_500_000, incomeTaxDeduction: 320_000, residentTaxDeduction: 150_000 },
    { maxIncome: 25_000_000, incomeTaxDeduction: 160_000, residentTaxDeduction: 0 },
  ],

  /**
   * 配偶者控除テーブル (令和7年分以降)
   * 配偶者の合計所得金額58万円以下で適用
   * 本人の合計所得金額1,000万円超は適用不可
   */
  spouseDeduction: [
    {
      maxOwnerIncome: 9_000_000,
      incomeTaxGeneral: 380_000,
      incomeTaxElderly: 480_000,
      residentTaxGeneral: 330_000,
      residentTaxElderly: 380_000,
    },
    {
      maxOwnerIncome: 9_500_000,
      incomeTaxGeneral: 260_000,
      incomeTaxElderly: 320_000,
      residentTaxGeneral: 220_000,
      residentTaxElderly: 260_000,
    },
    {
      maxOwnerIncome: 10_000_000,
      incomeTaxGeneral: 130_000,
      incomeTaxElderly: 160_000,
      residentTaxGeneral: 110_000,
      residentTaxElderly: 130_000,
    },
  ],

  /**
   * 配偶者特別控除テーブル (令和7年分所得税 / 令和8年度住民税以降)
   * 配偶者の合計所得金額58万円超~133万円以下
   */
  spouseSpecialDeduction: [
    { minSpouseIncome: 580_000, maxSpouseIncome: 950_000, incomeTax: [380_000, 260_000, 130_000], residentTax: [330_000, 220_000, 110_000] },
    { minSpouseIncome: 950_000, maxSpouseIncome: 1_000_000, incomeTax: [360_000, 240_000, 120_000], residentTax: [330_000, 220_000, 110_000] },
    { minSpouseIncome: 1_000_000, maxSpouseIncome: 1_050_000, incomeTax: [310_000, 210_000, 110_000], residentTax: [310_000, 210_000, 110_000] },
    { minSpouseIncome: 1_050_000, maxSpouseIncome: 1_100_000, incomeTax: [260_000, 180_000, 90_000], residentTax: [260_000, 180_000, 90_000] },
    { minSpouseIncome: 1_100_000, maxSpouseIncome: 1_150_000, incomeTax: [210_000, 140_000, 70_000], residentTax: [210_000, 140_000, 70_000] },
    { minSpouseIncome: 1_150_000, maxSpouseIncome: 1_200_000, incomeTax: [160_000, 110_000, 60_000], residentTax: [160_000, 110_000, 60_000] },
    { minSpouseIncome: 1_200_000, maxSpouseIncome: 1_250_000, incomeTax: [110_000, 80_000, 40_000], residentTax: [110_000, 80_000, 40_000] },
    { minSpouseIncome: 1_250_000, maxSpouseIncome: 1_300_000, incomeTax: [60_000, 40_000, 20_000], residentTax: [60_000, 40_000, 20_000] },
    { minSpouseIncome: 1_300_000, maxSpouseIncome: 1_330_000, incomeTax: [30_000, 20_000, 10_000], residentTax: [30_000, 20_000, 10_000] },
  ],

  /** 扶養控除テーブル (令和7年分以降) */
  dependentDeductions: [
    {
      type: 'general',
      label: '一般の控除対象扶養親族',
      ageRange: '16歳以上 (特定・老人以外)',
      incomeTaxDeduction: 380_000,
      residentTaxDeduction: 330_000,
    },
    {
      type: 'specific',
      label: '特定扶養親族',
      ageRange: '19歳以上23歳未満',
      incomeTaxDeduction: 630_000,
      residentTaxDeduction: 450_000,
    },
    {
      type: 'elderly',
      label: '老人扶養親族 (非同居)',
      ageRange: '70歳以上',
      incomeTaxDeduction: 480_000,
      residentTaxDeduction: 380_000,
    },
    {
      type: 'elderlyCoResident',
      label: '老人扶養親族 (同居老親等)',
      ageRange: '70歳以上 (直系尊属で同居)',
      incomeTaxDeduction: 580_000,
      residentTaxDeduction: 450_000,
    },
  ],

  /** 住民税定数 (東京都特別区) */
  residentTax: {
    wardRate: 0.06,
    metroRate: 0.04,
    totalRate: 0.10,
    perCapitaWard: 3_000,
    perCapitaMetro: 1_000,
    forestEnvironmentTax: 1_000,
    perCapitaTotal: 5_000,
  },

  /** 生命保険料控除 合計上限（所得税） */
  lifeInsuranceMaxTotal: 120_000,

  /** 生命保険料控除 合計上限（住民税） */
  lifeInsuranceResidentMaxTotal: 70_000,

  /** 医療費控除しきい値 */
  medicalExpenseThreshold: 100_000,

  /** 医療費控除上限 */
  medicalExpenseMaxDeduction: 2_000_000,
} satisfies TaxRateConfig
