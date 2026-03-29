<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { Card, CardContent } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Switch } from '~/components/ui/switch'
import { Separator } from '~/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip'
import { getBasicDeduction } from '~/utils/deduction-calculator'

const engine = inject<ReturnType<typeof useTaxEngine>>('taxEngine')!
const fmt = new Intl.NumberFormat('ja-JP')

const MAX_PROFIT_IN_MAN = 100_000

const profitInMan = computed({
  get: () => Math.round(engine.totalProfit.value / 10_000),
  set: (v: number) => {
    const safeValue = Number.isFinite(v) ? v : 0
    engine.totalProfit.value = Math.min(Math.max(0, safeValue), MAX_PROFIT_IN_MAN) * 10_000
  },
})

const prefectures = [
  { value: 'tokyo', label: '東京都' },
]

// --- 控除 ---
const showDeductions = ref(false)

const autoDeductions = computed(() => {
  const r = engine.result.value
  return [
    { label: '給与所得控除', amount: r.annualCompensation - r.employmentIncome },
    { label: '社保控除', amount: r.socialInsurance.employeeAnnual },
    { label: '基礎控除', amount: getBasicDeduction(r.employmentIncome, 'incomeTax') },
  ]
})
const autoTotal = computed(() => autoDeductions.value.reduce((s, d) => s + d.amount, 0))

const hasSpouse = computed({
  get: () => engine.deductionSettings.value.spouseIncome !== undefined,
  set: (v: boolean) => {
    const s = { ...engine.deductionSettings.value }
    if (v) { s.spouseIncome = 0 } else { delete s.spouseIncome }
    engine.deductionSettings.value = s
  },
})

const hasSmallBusiness = computed({
  get: () => (engine.deductionSettings.value.smallBusinessMutualAid ?? 0) > 0,
  set: (v: boolean) => {
    engine.deductionSettings.value = {
      ...engine.deductionSettings.value,
      smallBusinessMutualAid: v ? 840_000 : 0,
    }
  },
})
const smallBusinessInMan = computed({
  get: () => Math.round((engine.deductionSettings.value.smallBusinessMutualAid ?? 0) / 10_000),
  set: (v: number) => {
    engine.deductionSettings.value = {
      ...engine.deductionSettings.value,
      smallBusinessMutualAid: Math.min(Math.max(0, v), 84) * 10_000,
    }
  },
})

const hasIdeco = computed({
  get: () => (engine.deductionSettings.value.ideco ?? 0) > 0,
  set: (v: boolean) => {
    engine.deductionSettings.value = {
      ...engine.deductionSettings.value,
      ideco: v ? 276_000 : 0,
    }
  },
})
const idecoInMan = computed({
  get: () => (engine.deductionSettings.value.ideco ?? 0) / 10_000,
  set: (v: number) => {
    engine.deductionSettings.value = {
      ...engine.deductionSettings.value,
      ideco: Math.min(Math.max(0, v), 27.6) * 10_000,
    }
  },
})

const hasSafety = computed({
  get: () => (engine.deductionSettings.value.safetyMutualAid ?? 0) > 0,
  set: (v: boolean) => {
    engine.deductionSettings.value = {
      ...engine.deductionSettings.value,
      safetyMutualAid: v ? 2_400_000 : 0,
    }
  },
})
const safetyInMan = computed({
  get: () => Math.round((engine.deductionSettings.value.safetyMutualAid ?? 0) / 10_000),
  set: (v: number) => {
    engine.deductionSettings.value = {
      ...engine.deductionSettings.value,
      safetyMutualAid: Math.min(Math.max(0, v), 240) * 10_000,
    }
  },
})

const hasLifeInsurance = computed({
  get: () => (engine.deductionSettings.value.lifeInsurancePremium ?? 0) > 0,
  set: (v: boolean) => {
    engine.deductionSettings.value = {
      ...engine.deductionSettings.value,
      lifeInsurancePremium: v ? 100_000 : 0,
    }
  },
})
const lifeInsuranceInMan = computed({
  get: () => (engine.deductionSettings.value.lifeInsurancePremium ?? 0) / 10_000,
  set: (v: number) => {
    engine.deductionSettings.value = {
      ...engine.deductionSettings.value,
      lifeInsurancePremium: Math.max(0, v) * 10_000,
    }
  },
})

const hasMedical = computed({
  get: () => (engine.deductionSettings.value.medicalExpense ?? 0) > 0,
  set: (v: boolean) => {
    engine.deductionSettings.value = {
      ...engine.deductionSettings.value,
      medicalExpense: v ? 200_000 : 0,
    }
  },
})
const medicalInMan = computed({
  get: () => (engine.deductionSettings.value.medicalExpense ?? 0) / 10_000,
  set: (v: number) => {
    engine.deductionSettings.value = {
      ...engine.deductionSettings.value,
      medicalExpense: Math.max(0, v) * 10_000,
    }
  },
})

// 有効な控除数をカウント（折りたたみ時のサマリー用）
const activeDeductionCount = computed(() => {
  const d = engine.deductionSettings.value
  let count = 0
  if (d.spouseIncome !== undefined) count++
  if ((d.smallBusinessMutualAid ?? 0) > 0) count++
  if ((d.ideco ?? 0) > 0) count++
  if ((d.safetyMutualAid ?? 0) > 0) count++
  if ((d.lifeInsurancePremium ?? 0) > 0) count++
  if ((d.medicalExpense ?? 0) > 0) count++
  return count
})
</script>

<template>
  <Card>
    <CardContent class="p-5 space-y-4">
      <!-- 上段: 利益 + プロフィール -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
        <!-- 利益総額（メイン入力） -->
        <div class="flex items-center gap-3">
          <Label class="shrink-0 text-sm font-medium">利益総額</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <button
                  type="button"
                  class="inline-flex size-4 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground"
                >
                  ?
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p class="max-w-[240px] text-xs">
                  売上から役員報酬以外のすべての経費を引いた金額です
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Input
            v-model.number="profitInMan"
            type="number"
            :min="0"
            class="w-32 text-right text-lg font-mono"
          />
          <span class="text-sm text-muted-foreground">万円</span>
        </div>

        <!-- プロフィール -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <Label class="shrink-0 text-xs text-muted-foreground">年齢</Label>
            <Input
              v-model.number="engine.age.value"
              type="number"
              :min="18"
              :max="100"
              class="w-16 text-right text-sm font-mono"
            />
          </div>
          <div class="flex items-center gap-2">
            <Label class="shrink-0 text-xs text-muted-foreground">都道府県</Label>
            <Select v-model="engine.prefecture.value">
              <SelectTrigger class="w-28 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="pref in prefectures"
                  :key="pref.value"
                  :value="pref.value"
                >
                  {{ pref.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <!-- 控除設定（折りたたみ） -->
      <Collapsible v-model:open="showDeductions">
        <CollapsibleTrigger class="flex w-full items-center justify-between rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted/50">
          <div class="flex items-center gap-3">
            <span class="font-medium">控除設定</span>
            <span class="text-xs text-muted-foreground">
              自動控除 ¥{{ fmt.format(autoTotal) }}
              <template v-if="activeDeductionCount > 0">
                + 追加{{ activeDeductionCount }}件
              </template>
            </span>
          </div>
          <span class="text-xs text-muted-foreground">{{ showDeductions ? '▲' : '▼' }}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div class="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 rounded-lg border border-border/50 p-4 md:grid-cols-3">
            <!-- 自動控除 -->
            <div class="space-y-1.5">
              <p class="text-xs font-medium">自動控除</p>
              <div
                v-for="item in autoDeductions"
                :key="item.label"
                class="flex items-center justify-between text-xs"
              >
                <span class="text-muted-foreground">{{ item.label }}</span>
                <span class="font-mono">{{ fmt.format(item.amount) }}</span>
              </div>
            </div>

            <!-- 所得控除 -->
            <div class="space-y-2.5">
              <p class="text-xs font-medium">所得控除</p>
              <div class="flex items-center justify-between">
                <Label class="text-xs">配偶者控除</Label>
                <Switch v-model="hasSpouse" />
              </div>
              <div class="space-y-1">
                <div class="flex items-center justify-between">
                  <Label class="text-xs">小規模企業共済</Label>
                  <Switch v-model="hasSmallBusiness" />
                </div>
                <div v-show="hasSmallBusiness" class="flex items-center gap-1 pl-3">
                  <Input v-model.number="smallBusinessInMan" type="number" :min="0" :max="84" class="w-16 text-right text-xs font-mono" />
                  <span class="text-[10px] text-muted-foreground">万/年 (上限84万)</span>
                </div>
              </div>
              <div class="space-y-1">
                <div class="flex items-center justify-between">
                  <Label class="text-xs">iDeCo</Label>
                  <Switch v-model="hasIdeco" />
                </div>
                <div v-show="hasIdeco" class="flex items-center gap-1 pl-3">
                  <Input v-model.number="idecoInMan" type="number" :min="0" :max="27.6" :step="0.1" class="w-16 text-right text-xs font-mono" />
                  <span class="text-[10px] text-muted-foreground">万/年 (上限27.6万)</span>
                </div>
              </div>
            </div>

            <!-- 法人損金・その他 -->
            <div class="space-y-2.5">
              <p class="text-xs font-medium">法人損金・その他</p>
              <div class="space-y-1">
                <div class="flex items-center justify-between">
                  <Label class="text-xs">経営セーフティ共済</Label>
                  <Switch v-model="hasSafety" />
                </div>
                <div v-show="hasSafety" class="flex items-center gap-1 pl-3">
                  <Input v-model.number="safetyInMan" type="number" :min="0" :max="240" class="w-16 text-right text-xs font-mono" />
                  <span class="text-[10px] text-muted-foreground">万/年 (上限240万)</span>
                </div>
              </div>
              <div class="space-y-1">
                <div class="flex items-center justify-between">
                  <Label class="text-xs">生命保険料控除</Label>
                  <Switch v-model="hasLifeInsurance" />
                </div>
                <div v-show="hasLifeInsurance" class="flex items-center gap-1 pl-3">
                  <Input v-model.number="lifeInsuranceInMan" type="number" :min="0" class="w-16 text-right text-xs font-mono" />
                  <span class="text-[10px] text-muted-foreground">万/年</span>
                </div>
              </div>
              <div class="space-y-1">
                <div class="flex items-center justify-between">
                  <Label class="text-xs">医療費控除</Label>
                  <Switch v-model="hasMedical" />
                </div>
                <div v-show="hasMedical" class="flex items-center gap-1 pl-3">
                  <Input v-model.number="medicalInMan" type="number" :min="0" class="w-16 text-right text-xs font-mono" />
                  <span class="text-[10px] text-muted-foreground">万/年 (10万超が控除)</span>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </CardContent>
  </Card>
</template>
