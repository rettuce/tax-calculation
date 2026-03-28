import { describe, test, expect } from 'vitest'
import {
  calculateCorporateTaxes,
  calculateEffectiveTaxRate,
} from '~/utils/corporate-tax-calculator'

/** デフォルト法人プロフィール: 資本金100万・従業員1名・東京23区 */
const DEFAULT_CONFIG = {
  capital: 1_000_000,
  employees: 1,
}

describe('calculateCorporateTaxes', () => {
  describe('所得ゼロ', () => {
    test('均等割のみ 70,000円', () => {
      const result = calculateCorporateTaxes(0, DEFAULT_CONFIG)
      expect(result.corporateTax).toBe(0)
      expect(result.localCorporateTax).toBe(0)
      expect(result.inhabitantTax).toBe(0)
      expect(result.flatRate).toBe(70_000)
      expect(result.businessTax).toBe(0)
      expect(result.specialBusinessTax).toBe(0)
      expect(result.totalTax).toBe(70_000)
    })
  })

  describe('所得500万', () => {
    test('各税目が正しく計算される（100円未満切捨て）', () => {
      const result = calculateCorporateTaxes(5_000_000, DEFAULT_CONFIG)

      // 法人税: 5,000,000 * 15% = 750,000 → roundTaxAmount → 750,000
      expect(result.corporateTax).toBe(750_000)

      // 地方法人税: 750,000 * 10.3% = 77,250 → roundTaxAmount → 77,200
      expect(result.localCorporateTax).toBe(77_200)

      // 住民税法人税割: 750,000 * 7.0% = 52,500 → roundTaxAmount → 52,500
      expect(result.inhabitantTax).toBe(52_500)

      // 均等割: 70,000
      expect(result.flatRate).toBe(70_000)

      // 事業税: 4M*3.5% + 1M*5.3% = 140,000 + 53,000 = 193,000 → roundTaxAmount → 193,000
      expect(result.businessTax).toBe(193_000)

      // 特別法人事業税: 193,000 * 37% = 71,410 → roundTaxAmount → 71,400
      expect(result.specialBusinessTax).toBe(71_400)

      // 合計: 750,000 + 77,200 + 52,500 + 70,000 + 193,000 + 71,400 = 1,214,100
      expect(result.totalTax).toBe(1_214_100)
    })
  })

  describe('所得1000万', () => {
    test('法人税の軽減税率ブラケットをまたぐ計算', () => {
      const result = calculateCorporateTaxes(10_000_000, DEFAULT_CONFIG)

      // 法人税: 8M*15% + 2M*23.2% = 1,200,000 + 464,000 = 1,664,000 → roundTaxAmount → 1,664,000
      expect(result.corporateTax).toBe(1_664_000)

      // 地方法人税: 1,664,000 * 10.3% = 171,392 → roundTaxAmount → 171,300
      expect(result.localCorporateTax).toBe(171_300)

      // 住民税法人税割: 1,664,000 * 7.0% = 116,480 → roundTaxAmount → 116,400
      expect(result.inhabitantTax).toBe(116_400)

      // 均等割: 70,000
      expect(result.flatRate).toBe(70_000)

      // 事業税: 4M*3.5% + 4M*5.3% + 2M*7.0% = 140,000 + 212,000 + 140,000 = 492,000
      expect(result.businessTax).toBe(492_000)

      // 特別法人事業税: 492,000 * 37% = 182,040 → roundTaxAmount → 182,000
      expect(result.specialBusinessTax).toBe(182_000)

      // 合計: 1,664,000 + 171,300 + 116,400 + 70,000 + 492,000 + 182,000 = 2,695,700
      expect(result.totalTax).toBe(2_695_700)
    })
  })

  describe('1,000円未満の端数処理', () => {
    test('課税所得が1,000円未満切捨てされてから計算', () => {
      const result = calculateCorporateTaxes(5_000_999, DEFAULT_CONFIG)
      // roundTaxableIncome(5,000,999) = 5,000,000 → 所得500万と同じ結果
      expect(result.corporateTax).toBe(750_000)
      expect(result.totalTax).toBe(1_214_100)
    })
  })

  describe('負の所得', () => {
    test('課税所得が負の場合は均等割のみ', () => {
      const result = calculateCorporateTaxes(-1_000_000, DEFAULT_CONFIG)
      expect(result.corporateTax).toBe(0)
      expect(result.totalTax).toBe(70_000)
    })
  })

  describe('超過税率の適用', () => {
    test('資本金1億超の場合、住民税は超過税率', () => {
      const largeCapital = { capital: 200_000_000, employees: 1 }
      const result = calculateCorporateTaxes(5_000_000, largeCapital)

      // 住民税法人税割: 750,000 * 10.4% = 78,000 → roundTaxAmount → 78,000
      expect(result.inhabitantTax).toBe(78_000)

      // 事業税: 超過税率 4M*3.75% + 1M*5.665% = 150,000 + 56,650 = 206,650 → roundTaxAmount → 206,600
      expect(result.businessTax).toBe(206_600)

      // 特別法人事業税: 標準税率で再計算 193,000 * 37% = 71,410 → roundTaxAmount → 71,400
      expect(result.specialBusinessTax).toBe(71_400)
    })

    test('法人税額1000万超の場合、住民税は超過税率', () => {
      // 法人税額が1000万超になる所得を計算
      // 8M*15% + X*23.2% > 10M → X > (10M - 1.2M) / 0.232 = 37,931,034.48
      // 所得 = 8M + 38M = 46M
      const result = calculateCorporateTaxes(46_000_000, DEFAULT_CONFIG)

      // 法人税: 8M*15% + 38M*23.2% = 1,200,000 + 8,816,000 = 10,016,000
      expect(result.corporateTax).toBe(10_016_000)

      // 住民税法人税割: 10,016,000 * 10.4% = 1,041,664 → roundTaxAmount → 1,041,600
      // (法人税額 > 10M → 超過税率)
      expect(result.inhabitantTax).toBe(1_041_600)
    })

    test('資本金1億以下でも所得2500万超なら事業税は超過税率', () => {
      const result = calculateCorporateTaxes(30_000_000, DEFAULT_CONFIG)

      // 事業税: 超過税率 4M*3.75% + 4M*5.665% + 22M*7.48%
      // = 150,000 + 226,600 + 1,645,600 = 2,022,200
      expect(result.businessTax).toBe(2_022_200)

      // 特別法人事業税: 標準税率ベース 4M*3.5% + 4M*5.3% + 22M*7.0% = 1,892,000
      // 1,892,000 * 37% = 700,040 → roundTaxAmount → 700,000
      expect(result.specialBusinessTax).toBe(700_000)
    })

    test('資本金1億超かつ所得2500万超は事業税に超過税率', () => {
      const largeCapital = { capital: 200_000_000, employees: 60 }
      const result = calculateCorporateTaxes(30_000_000, largeCapital)

      // 事業税: 超過税率 4M*3.75% + 4M*5.665% + 22M*7.48%
      // = 150,000 + 226,600 + 1,645,600 = 2,022,200
      expect(result.businessTax).toBe(2_022_200)

      // 特別法人事業税: 標準税率ベース 4M*3.5% + 4M*5.3% + 22M*7.0% = 1,892,000
      // 1,892,000 * 37% = 700,040 → roundTaxAmount → 700,000
      expect(result.specialBusinessTax).toBe(700_000)
    })
  })
})

describe('calculateEffectiveTaxRate', () => {
  test('所得500万で実効税率が妥当な範囲', () => {
    const rate = calculateEffectiveTaxRate(5_000_000, DEFAULT_CONFIG)
    // 中小法人の実効税率は概ね21-25%程度
    expect(rate).toBeGreaterThan(0.20)
    expect(rate).toBeLessThan(0.30)
  })

  test('所得1000万で実効税率が妥当な範囲', () => {
    const rate = calculateEffectiveTaxRate(10_000_000, DEFAULT_CONFIG)
    // 中小法人の実効税率は概ね23-28%程度
    expect(rate).toBeGreaterThan(0.23)
    expect(rate).toBeLessThan(0.30)
  })

  test('所得0で実効税率は0', () => {
    const rate = calculateEffectiveTaxRate(0, DEFAULT_CONFIG)
    expect(rate).toBe(0)
  })

  test('所得が増えると実効税率は上昇する', () => {
    const rate5m = calculateEffectiveTaxRate(5_000_000, DEFAULT_CONFIG)
    const rate10m = calculateEffectiveTaxRate(10_000_000, DEFAULT_CONFIG)
    const rate50m = calculateEffectiveTaxRate(50_000_000, DEFAULT_CONFIG)
    expect(rate10m).toBeGreaterThan(rate5m)
    expect(rate50m).toBeGreaterThan(rate10m)
  })
})
