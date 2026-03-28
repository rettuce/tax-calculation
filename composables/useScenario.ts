/**
 * useScenario — シナリオ保存・管理
 *
 * 計算パラメータと結果を localStorage に保存し、
 * 比較やエクスポート/インポートを可能にする。
 * Zod でバリデーションし、不正データは静かに無視する。
 */
import { ref } from 'vue'
import { z } from 'zod'

const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  createdAt: z.string(),
  params: z.object({
    totalProfit: z.number().min(0).max(1_000_000_000),
    monthlyCompensation: z.number().min(0).max(100_000_000),
    bonusAmount: z.number().min(0).max(100_000_000),
    bonusCount: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    age: z.number().min(18).max(100),
    prefecture: z.string(),
    deductions: z.record(z.string(), z.unknown()),
  }),
  result: z.object({
    personalNetIncome: z.number(),
    corporateRetained: z.number(),
    totalNetIncome: z.number(),
    totalTax: z.number(),
    totalSocialInsurance: z.number(),
  }),
})

export type Scenario = z.infer<typeof ScenarioSchema>

const STORAGE_KEY = 'tax-calc-scenarios'

export function useScenario() {
  const scenarios = ref<Scenario[]>(loadScenarios())

  function loadScenarios(): Scenario[] {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      return z.array(ScenarioSchema).parse(JSON.parse(raw))
    } catch {
      return []
    }
  }

  function persist() {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios.value))
  }

  function saveScenario(
    name: string,
    params: Scenario['params'],
    result: Scenario['result'],
  ): Scenario {
    const scenario: Scenario = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      params,
      result,
    }
    scenarios.value = [...scenarios.value, scenario]
    persist()
    return scenario
  }

  function deleteScenario(id: string) {
    scenarios.value = scenarios.value.filter((s) => s.id !== id)
    persist()
  }

  function deleteAllScenarios() {
    scenarios.value = []
    persist()
  }

  function exportScenarios(): string {
    return JSON.stringify(scenarios.value, null, 2)
  }

  function importScenarios(json: string): boolean {
    try {
      const parsed = z.array(ScenarioSchema).parse(JSON.parse(json))
      scenarios.value = [...scenarios.value, ...parsed]
      persist()
      return true
    } catch {
      return false
    }
  }

  return {
    scenarios,
    saveScenario,
    deleteScenario,
    deleteAllScenarios,
    exportScenarios,
    importScenarios,
  }
}
