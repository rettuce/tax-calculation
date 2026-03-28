/**
 * useTaxEngine — Vue リアクティブ統合レイヤー
 *
 * utils/optimizer.ts の純粋関数を Vue の ref/computed でラップし、
 * UI コンポーネントに計算結果と警告をリアクティブに提供する。
 */
import { ref, computed } from 'vue'
import { calculateAll, optimize } from '~/utils/optimizer'
import type {
  CalculationResult,
  OptimizationGoal,
  OptimizationResult,
  DeductionSettings,
} from '~/utils/optimizer'

export function useTaxEngine() {
  // === Input refs ===
  const totalProfit = ref(20_000_000)
  const monthlyCompensation = ref(500_000)
  const bonusAmount = ref(0)
  const bonusCount = ref<1 | 2 | 3>(1)
  const age = ref(35)
  const prefecture = ref('tokyo')
  const optimizationGoal = ref<OptimizationGoal>('maxTotalRetained')

  const deductionSettings = ref<DeductionSettings>({
    hasYoungDependent: false,
  })

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

    // Warning
    if (monthlyCompensation.value === 0) {
      w.push({
        id: 'zeroSalary',
        level: 'warning',
        message: '社会保険の加入資格を失う可能性があります',
      })
    }
    if (monthlyCompensation.value === 0 && bonusAmount.value > 0) {
      w.push({
        id: 'bonusOnly',
        level: 'warning',
        message: '定期同額給与がない場合の実務リスクがあります',
      })
    }
    if (annualCompensation.value > totalProfit.value * 0.5) {
      w.push({
        id: 'excessiveComp',
        level: 'warning',
        message: '過大役員報酬と認定されるリスクがあります',
      })
    }
    if (
      annualCompensation.value > 0 &&
      annualCompensation.value < totalProfit.value * 0.1
    ) {
      w.push({
        id: 'tooLowComp',
        level: 'warning',
        message: '極端に低い報酬は行為計算否認のリスクがあります',
      })
    }

    // Info
    if (monthlyCompensation.value > 650_000) {
      w.push({
        id: 'pensionCap',
        level: 'info',
        message: '厚生年金保険料は上限に達しています',
      })
    }
    if (
      bonusAmount.value / Math.max(bonusCount.value, 1) > 1_500_000
    ) {
      w.push({
        id: 'bonusPensionCap',
        level: 'info',
        message:
          '厚生年金の標準賞与額上限超過（年金受給額に影響）',
      })
    }
    if (bonusAmount.value > 5_730_000) {
      w.push({
        id: 'bonusHealthCap',
        level: 'info',
        message: '健康保険の標準賞与額年間上限超過',
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
