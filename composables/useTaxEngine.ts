/**
 * useTaxEngine — Vue リアクティブ統合レイヤー
 *
 * utils/optimizer.ts の純粋関数を Vue の ref/computed でラップし、
 * UI コンポーネントに計算結果と警告をリアクティブに提供する。
 */
import { ref, computed, watch } from 'vue'
import { calculateAll, optimize } from '~/utils/optimizer'
import type {
  CalculationResult,
  OptimizationGoal,
  OptimizationResult,
  DeductionSettings,
} from '~/utils/optimizer'

const PROFILE_STORAGE_KEY = 'tax-calc-profile'

interface StoredProfile {
  age: number
  prefecture: string
  deductions: DeductionSettings
}

function loadProfile(): StoredProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredProfile
  } catch { return null }
}

export function useTaxEngine() {
  const stored = loadProfile()

  // === Input refs ===
  const totalProfit = ref(20_000_000)
  const monthlyCompensation = ref(500_000)
  const bonusAmount = ref(0)
  const bonusCount = ref<1 | 2 | 3>(1)
  const age = ref(stored?.age ?? 35)
  const prefecture = ref(stored?.prefecture ?? 'tokyo')
  const optimizationGoal = ref<OptimizationGoal>('maxTotalRetained')

  const deductionSettings = ref<DeductionSettings>(
    stored?.deductions ?? { hasYoungDependent: false },
  )

  // Persist profile & deductions to localStorage
  watch(
    [age, prefecture, deductionSettings],
    () => {
      if (typeof window === 'undefined') return
      const profile: StoredProfile = {
        age: age.value,
        prefecture: prefecture.value,
        deductions: deductionSettings.value,
      }
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
    },
    { deep: true },
  )

  // === Computed chain ===
  const annualCompensation = computed(
    () => monthlyCompensation.value * 12 + bonusAmount.value,
  )

  const result = computed<CalculationResult>(() =>
    calculateAll({
      totalProfit: totalProfit.value,
      monthlyCompensation: monthlyCompensation.value,
      bonusAmount: bonusAmount.value,
      bonusCount: bonusCount.value,
      age: age.value,
      prefecture: prefecture.value,
      deductions: deductionSettings.value,
    }),
  )

  // === Warning evaluation ===
  const warnings = computed(() => {
    const r = result.value
    const w: Array<{
      id: string
      level: 'critical' | 'warning' | 'info'
      message: string
    }> = []

    // Critical
    if (r.corporateIncome < 0) {
      w.push({
        id: 'deficit',
        level: 'critical',
        message: '法人が赤字になります',
      })
    }

    const fmtMan = (n: number) => `${Math.round(n / 10_000)}万円`
    const fmtYen = (n: number) => `¥${new Intl.NumberFormat('ja-JP').format(n)}`
    const halfProfit = totalProfit.value * 0.5
    const tenthProfit = totalProfit.value * 0.1

    // Warning
    if (monthlyCompensation.value === 0) {
      w.push({
        id: 'zeroSalary',
        level: 'warning',
        message: '月額0円は社会保険の加入資格を失う可能性があります',
      })
    }
    if (monthlyCompensation.value === 0 && bonusAmount.value > 0) {
      w.push({
        id: 'bonusOnly',
        level: 'warning',
        message: '定期同額給与がない場合の実務リスクがあります（届出不履行で全額損金不算入）',
      })
    }
    if (annualCompensation.value > halfProfit) {
      w.push({
        id: 'excessiveComp',
        level: 'warning',
        message: `報酬が利益の50%超（${fmtMan(halfProfit)}）です。過大役員報酬と認定されるリスクがあります`,
      })
    }
    if (annualCompensation.value > 0 && annualCompensation.value < tenthProfit) {
      w.push({
        id: 'tooLowComp',
        level: 'warning',
        message: `報酬が利益の10%未満（${fmtMan(tenthProfit)}）です。行為計算否認のリスクがあります`,
      })
    }

    // Info — 具体的な閾値・推奨値を併記
    if (monthlyCompensation.value > 650_000) {
      w.push({
        id: 'pensionCap',
        level: 'info',
        message: `厚生年金は月額65万円で上限。現在の月額${fmtMan(monthlyCompensation.value)}のうち${fmtMan(monthlyCompensation.value - 650_000)}分は年金保険料に影響しません`,
      })
    }
    const perPayment = bonusAmount.value / Math.max(bonusCount.value, 1)
    if (perPayment > 1_500_000) {
      w.push({
        id: 'bonusPensionCap',
        level: 'info',
        message: `厚生年金の賞与上限は1回150万円。現在1回${fmtMan(perPayment)}のうち${fmtMan(perPayment - 1_500_000)}分は年金保険料対象外（将来の年金受給額が減少）`,
      })
    }
    if (bonusAmount.value > 5_730_000) {
      w.push({
        id: 'bonusHealthCap',
        level: 'info',
        message: `健康保険の賞与上限は年573万円。現在${fmtMan(bonusAmount.value)}のうち${fmtMan(bonusAmount.value - 5_730_000)}分は健保料対象外`,
      })
    }
    if (r.employmentIncome > 24_000_000) {
      w.push({
        id: 'basicDeductionReduced',
        level: 'info',
        message: '基礎控除が減額されます',
      })
    }
    if (annualCompensation.value > 20_000_000) {
      w.push({
        id: 'taxReturn',
        level: 'info',
        message:
          '確定申告が必要です。税理士への相談を推奨します',
      })
    }
    if (r.corporateIncome <= 0 && totalProfit.value > 0) {
      w.push({
        id: 'flatRateOnly',
        level: 'info',
        message: '赤字でも均等割70,000円は課税されます',
      })
    }

    return w
  })

  // === Optimization ===
  const optimizationResult = ref<{
    monthlyCompensation: number
    bonusAmount: number
    bonusCount: 1 | 2 | 3
    reason: string
  } | null>(null)

  function runOptimization() {
    const opt: OptimizationResult = optimize({
      totalProfit: totalProfit.value,
      age: age.value,
      prefecture: prefecture.value,
      goal: optimizationGoal.value,
      deductions: deductionSettings.value,
    })

    // optimizer の結果を入力 ref に反映
    monthlyCompensation.value = opt.monthlyCompensation
    bonusAmount.value = opt.bonusAmount
    // bonusCount は OptimizationResult に含まれないため現在値を維持
    optimizationResult.value = {
      monthlyCompensation: opt.monthlyCompensation,
      bonusAmount: opt.bonusAmount,
      bonusCount: bonusCount.value,
      reason: opt.reason,
    }
  }

  return {
    // Inputs
    totalProfit,
    monthlyCompensation,
    bonusAmount,
    bonusCount,
    age,
    prefecture,
    optimizationGoal,
    deductionSettings,
    // Computed
    annualCompensation,
    result,
    warnings,
    // Actions
    runOptimization,
    optimizationResult,
  }
}
