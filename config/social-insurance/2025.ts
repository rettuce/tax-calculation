/**
 * 令和7年度（2025年度）社会保険料データ
 *
 * 対象: 協会けんぽ・東京都支部
 * 適用: 令和7年3月分（4月納付分）から
 *
 * 出典:
 * - 協会けんぽ 令和7年度 東京支部保険料率
 * - 日本年金機構 厚生年金保険料額表（令和7年度）
 * - 日本年金機構 標準報酬月額・賞与等
 */

import type { SocialInsuranceConfig } from './types'

export const socialInsurance2025 = {
  fiscalYear: '2025',
  prefecture: '東京都',

  rates: {
    /** 健康保険料率 9.91% (令和6年度 9.98%から引き下げ) */
    healthInsuranceRate: 0.0991,
    healthInsuranceRateHalf: 0.04955,

    /** 介護保険料率 1.59% (全国一律, 令和6年度 1.60%から引き下げ) */
    nursingCareRate: 0.0159,
    nursingCareRateHalf: 0.00795,

    /** 健康保険 + 介護保険 合計 11.50% */
    healthPlusNursingRate: 0.115,
    healthPlusNursingRateHalf: 0.0575,

    /** 厚生年金保険料率 18.3% (平成29年9月以降固定) */
    pensionRate: 0.183,
    pensionRateHalf: 0.0915,

    /** 子ども・子育て拠出金 0.36% (事業主全額負担) */
    childCareContributionRate: 0.0036,
  },

  /**
   * 標準報酬月額 全50等級テーブル
   *
   * 健康保険: 第1級(58,000) ~ 第50級(1,390,000)
   * 厚生年金: 第1級(88,000) ~ 第32級(650,000)
   *
   * - 健保1-3級は厚生年金では全て第1級(88,000)扱い -> pensionGrade: null
   * - 健保35級(650,000)が厚生年金の最高等級(第32級)
   * - 健保36-50級は厚生年金では全て第32級(650,000)扱い -> pensionGrade: null
   * - upperBound は「未満」を意味する
   */
  grades: [
    // --- 健保のみの等級（厚生年金は第1級 88,000 が適用される） ---
    { healthGrade: 1, pensionGrade: null, standardMonthly: 58_000, lowerBound: null, upperBound: 63_000 },
    { healthGrade: 2, pensionGrade: null, standardMonthly: 68_000, lowerBound: 63_000, upperBound: 73_000 },
    { healthGrade: 3, pensionGrade: null, standardMonthly: 78_000, lowerBound: 73_000, upperBound: 83_000 },

    // --- 健保・厚生年金の共通等級帯 ---
    { healthGrade: 4, pensionGrade: 1, standardMonthly: 88_000, lowerBound: 83_000, upperBound: 93_000 },
    { healthGrade: 5, pensionGrade: 2, standardMonthly: 98_000, lowerBound: 93_000, upperBound: 101_000 },
    { healthGrade: 6, pensionGrade: 3, standardMonthly: 104_000, lowerBound: 101_000, upperBound: 107_000 },
    { healthGrade: 7, pensionGrade: 4, standardMonthly: 110_000, lowerBound: 107_000, upperBound: 114_000 },
    { healthGrade: 8, pensionGrade: 5, standardMonthly: 118_000, lowerBound: 114_000, upperBound: 122_000 },
    { healthGrade: 9, pensionGrade: 6, standardMonthly: 126_000, lowerBound: 122_000, upperBound: 130_000 },
    { healthGrade: 10, pensionGrade: 7, standardMonthly: 134_000, lowerBound: 130_000, upperBound: 138_000 },
    { healthGrade: 11, pensionGrade: 8, standardMonthly: 142_000, lowerBound: 138_000, upperBound: 146_000 },
    { healthGrade: 12, pensionGrade: 9, standardMonthly: 150_000, lowerBound: 146_000, upperBound: 155_000 },
    { healthGrade: 13, pensionGrade: 10, standardMonthly: 160_000, lowerBound: 155_000, upperBound: 165_000 },
    { healthGrade: 14, pensionGrade: 11, standardMonthly: 170_000, lowerBound: 165_000, upperBound: 175_000 },
    { healthGrade: 15, pensionGrade: 12, standardMonthly: 180_000, lowerBound: 175_000, upperBound: 185_000 },
    { healthGrade: 16, pensionGrade: 13, standardMonthly: 190_000, lowerBound: 185_000, upperBound: 195_000 },
    { healthGrade: 17, pensionGrade: 14, standardMonthly: 200_000, lowerBound: 195_000, upperBound: 210_000 },
    { healthGrade: 18, pensionGrade: 15, standardMonthly: 220_000, lowerBound: 210_000, upperBound: 230_000 },
    { healthGrade: 19, pensionGrade: 16, standardMonthly: 240_000, lowerBound: 230_000, upperBound: 250_000 },
    { healthGrade: 20, pensionGrade: 17, standardMonthly: 260_000, lowerBound: 250_000, upperBound: 270_000 },
    { healthGrade: 21, pensionGrade: 18, standardMonthly: 280_000, lowerBound: 270_000, upperBound: 290_000 },
    { healthGrade: 22, pensionGrade: 19, standardMonthly: 300_000, lowerBound: 290_000, upperBound: 310_000 },
    { healthGrade: 23, pensionGrade: 20, standardMonthly: 320_000, lowerBound: 310_000, upperBound: 330_000 },
    { healthGrade: 24, pensionGrade: 21, standardMonthly: 340_000, lowerBound: 330_000, upperBound: 350_000 },
    { healthGrade: 25, pensionGrade: 22, standardMonthly: 360_000, lowerBound: 350_000, upperBound: 370_000 },
    { healthGrade: 26, pensionGrade: 23, standardMonthly: 380_000, lowerBound: 370_000, upperBound: 395_000 },
    { healthGrade: 27, pensionGrade: 24, standardMonthly: 410_000, lowerBound: 395_000, upperBound: 425_000 },
    { healthGrade: 28, pensionGrade: 25, standardMonthly: 440_000, lowerBound: 425_000, upperBound: 455_000 },
    { healthGrade: 29, pensionGrade: 26, standardMonthly: 470_000, lowerBound: 455_000, upperBound: 485_000 },
    { healthGrade: 30, pensionGrade: 27, standardMonthly: 500_000, lowerBound: 485_000, upperBound: 515_000 },
    { healthGrade: 31, pensionGrade: 28, standardMonthly: 530_000, lowerBound: 515_000, upperBound: 545_000 },
    { healthGrade: 32, pensionGrade: 29, standardMonthly: 560_000, lowerBound: 545_000, upperBound: 575_000 },
    { healthGrade: 33, pensionGrade: 30, standardMonthly: 590_000, lowerBound: 575_000, upperBound: 605_000 },
    { healthGrade: 34, pensionGrade: 31, standardMonthly: 620_000, lowerBound: 605_000, upperBound: 635_000 },
    { healthGrade: 35, pensionGrade: 32, standardMonthly: 650_000, lowerBound: 635_000, upperBound: 665_000 },

    // --- 健保のみの高等級帯（厚生年金は第32級 650,000 が上限） ---
    { healthGrade: 36, pensionGrade: null, standardMonthly: 680_000, lowerBound: 665_000, upperBound: 695_000 },
    { healthGrade: 37, pensionGrade: null, standardMonthly: 710_000, lowerBound: 695_000, upperBound: 730_000 },
    { healthGrade: 38, pensionGrade: null, standardMonthly: 750_000, lowerBound: 730_000, upperBound: 770_000 },
    { healthGrade: 39, pensionGrade: null, standardMonthly: 790_000, lowerBound: 770_000, upperBound: 810_000 },
    { healthGrade: 40, pensionGrade: null, standardMonthly: 830_000, lowerBound: 810_000, upperBound: 855_000 },
    { healthGrade: 41, pensionGrade: null, standardMonthly: 880_000, lowerBound: 855_000, upperBound: 905_000 },
    { healthGrade: 42, pensionGrade: null, standardMonthly: 930_000, lowerBound: 905_000, upperBound: 955_000 },
    { healthGrade: 43, pensionGrade: null, standardMonthly: 980_000, lowerBound: 955_000, upperBound: 1_005_000 },
    { healthGrade: 44, pensionGrade: null, standardMonthly: 1_030_000, lowerBound: 1_005_000, upperBound: 1_055_000 },
    { healthGrade: 45, pensionGrade: null, standardMonthly: 1_090_000, lowerBound: 1_055_000, upperBound: 1_115_000 },
    { healthGrade: 46, pensionGrade: null, standardMonthly: 1_150_000, lowerBound: 1_115_000, upperBound: 1_175_000 },
    { healthGrade: 47, pensionGrade: null, standardMonthly: 1_210_000, lowerBound: 1_175_000, upperBound: 1_235_000 },
    { healthGrade: 48, pensionGrade: null, standardMonthly: 1_270_000, lowerBound: 1_235_000, upperBound: 1_295_000 },
    { healthGrade: 49, pensionGrade: null, standardMonthly: 1_330_000, lowerBound: 1_295_000, upperBound: 1_355_000 },
    { healthGrade: 50, pensionGrade: null, standardMonthly: 1_390_000, lowerBound: 1_355_000, upperBound: null },
  ],

  bonusCaps: {
    /** 健康保険: 年度累計573万円 */
    healthAnnualCap: 5_730_000,
    /** 厚生年金: 1回あたり150万円 */
    pensionPerPaymentCap: 1_500_000,
  },

  pensionGradeRange: {
    minStandardMonthly: 88_000,
    maxStandardMonthly: 650_000,
    minGrade: 1,
    maxGrade: 32,
  },
} satisfies SocialInsuranceConfig
