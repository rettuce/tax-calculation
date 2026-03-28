/**
 * useYenFormat — 日本円表示フォーマッター
 */
const formatter = new Intl.NumberFormat('ja-JP')

/** 円 → ¥X,XXX 形式 */
export function formatYen(yen: number): string {
  return `¥${formatter.format(Math.round(yen))}`
}

/** 円 → X.X万円 形式 */
export function formatMan(yen: number): string {
  const man = yen / 10_000
  if (Number.isInteger(man)) return `${formatter.format(man)}万円`
  return `${formatter.format(Math.round(man * 10) / 10)}万円`
}

/** 円 → 万円の数値（input用） */
export function yenToMan(yen: number): number {
  return Math.round(yen / 10_000)
}

/** 万円 → 円 */
export function manToYen(man: number): number {
  return man * 10_000
}
