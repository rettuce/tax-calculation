import { describe, test, expect } from 'vitest'
import {
  roundTaxableIncome,
  roundTaxAmount,
  roundInsurancePremium,
  roundStandardBonus,
  applyRate,
} from '~/utils/rounding'

describe('roundTaxableIncome', () => {
  test('1,000円未満切捨て', () => {
    expect(roundTaxableIncome(2_833_700)).toBe(2_833_000)
    expect(roundTaxableIncome(5_000_000)).toBe(5_000_000)
    expect(roundTaxableIncome(999)).toBe(0)
    expect(roundTaxableIncome(0)).toBe(0)
    expect(roundTaxableIncome(-100)).toBe(0)
  })
})

describe('roundTaxAmount', () => {
  test('100円未満切捨て', () => {
    expect(roundTaxAmount(189_701)).toBe(189_700)
    expect(roundTaxAmount(100)).toBe(100)
    expect(roundTaxAmount(99)).toBe(0)
  })
})

describe('roundInsurancePremium', () => {
  test('50銭以下切捨て', () => {
    expect(roundInsurancePremium(24775.0)).toBe(24775)
    expect(roundInsurancePremium(24775.5)).toBe(24775)
  })
  test('50銭超切上げ', () => {
    expect(roundInsurancePremium(24775.51)).toBe(24776)
    expect(roundInsurancePremium(24775.9)).toBe(24776)
  })
})

describe('roundStandardBonus', () => {
  test('1,000円未満切捨て', () => {
    expect(roundStandardBonus(2_345_678)).toBe(2_345_000)
    expect(roundStandardBonus(1_000_000)).toBe(1_000_000)
  })
})

describe('applyRate', () => {
  test('浮動小数点誤差を即座に丸める', () => {
    expect(applyRate(1_000_000, 0.0991, 'round')).toBe(99100)
    expect(applyRate(500_000, 0.04955, 'floor')).toBe(24775)
  })
})
