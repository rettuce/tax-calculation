/** 課税所得: 1,000円未満切捨て（所得税・法人税共通） */
export function roundTaxableIncome(n: number): number {
  if (n <= 0) return 0
  return Math.floor(n / 1_000) * 1_000
}

/** 税額: 100円未満切捨て */
export function roundTaxAmount(n: number): number {
  if (n <= 0) return 0
  return Math.floor(n / 100) * 100
}

/** 社保保険料: 50銭以下切捨て、50銭超切上げ */
export function roundInsurancePremium(n: number): number {
  const yen = Math.floor(n)
  const sen = n - yen
  return sen <= 0.5 ? yen : yen + 1
}

/** 標準賞与額: 1,000円未満切捨て */
export function roundStandardBonus(n: number): number {
  if (n <= 0) return 0
  return Math.floor(n / 1_000) * 1_000
}

/**
 * 料率適用: 乗算直後に即座に丸める（浮動小数点誤差対策）
 */
export function applyRate(
  base: number,
  rate: number,
  rounding: 'floor' | 'round' | 'insurance',
): number {
  const raw = base * rate
  switch (rounding) {
    case 'floor':
      return Math.floor(raw)
    case 'round':
      return Math.round(raw)
    case 'insurance':
      return roundInsurancePremium(raw)
  }
}
