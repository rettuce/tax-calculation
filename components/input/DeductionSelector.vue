<script setup lang="ts">
import { computed, inject } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Switch } from '~/components/ui/switch'
import { Separator } from '~/components/ui/separator'

const engine = inject<ReturnType<typeof useTaxEngine>>('taxEngine')!

const fmt = new Intl.NumberFormat('ja-JP')

// Auto deductions (read-only summary)
const autoDeductions = computed(() => {
  const r = engine.result.value
  return [
    { label: '給与所得控除', amount: r.annualCompensation - r.employmentIncome },
    { label: '社会保険料控除', amount: r.socialInsurance.employeeAnnual },
    { label: '基礎控除 (所得税)', amount: getBasicDeduction(r.employmentIncome) },
  ]
})

const autoTotal = computed(() => autoDeductions.value.reduce((s, d) => s + d.amount, 0))

function getBasicDeduction(employmentIncome: number): number {
  if (employmentIncome <= 1_320_000) return 950_000
  if (employmentIncome <= 3_360_000) return 880_000
  if (employmentIncome <= 4_890_000) return 680_000
  if (employmentIncome <= 6_550_000) return 630_000
  if (employmentIncome <= 23_500_000) return 580_000
  if (employmentIncome <= 24_000_000) return 480_000
  if (employmentIncome <= 24_500_000) return 320_000
  if (employmentIncome <= 25_000_000) return 160_000
  return 0
}

// --- Layer 2: Main deduction controls ---
// These directly mutate deductionSettings while preserving other fields

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

// --- Layer 3: Other deductions ---

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

// Track which sections are expanded
const showMain = ref(true)
const showOther = ref(false)
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <CardTitle class="text-sm font-medium">控除設定</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Layer 1: Auto deductions (always visible) -->
      <div class="space-y-1.5">
        <div class="flex items-center justify-between text-xs">
          <span class="text-muted-foreground">自動控除</span>
          <span class="font-mono text-foreground">¥{{ fmt.format(autoTotal) }}</span>
        </div>
        <div
          v-for="item in autoDeductions"
          :key="item.label"
          class="flex items-center justify-between text-xs pl-3"
        >
          <span class="text-muted-foreground">{{ item.label }}</span>
          <span class="font-mono text-muted-foreground">{{ fmt.format(item.amount) }}</span>
        </div>
      </div>

      <Separator />

      <!-- Layer 2: Main deductions -->
      <div>
        <button
          class="flex w-full items-center justify-between text-xs font-medium py-1"
          @click="showMain = !showMain"
        >
          <span>主要控除</span>
          <span class="text-muted-foreground">{{ showMain ? '▼' : '▶' }}</span>
        </button>
        <div v-show="showMain" class="space-y-3 mt-2">
          <!-- 配偶者控除 -->
          <div class="flex items-center justify-between">
            <Label class="text-xs">配偶者控除 (38万円)</Label>
            <Switch :checked="hasSpouse" @update:checked="hasSpouse = $event" />
          </div>

          <!-- 小規模企業共済 -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <Label class="text-xs">小規模企業共済</Label>
              <Switch :checked="hasSmallBusiness" @update:checked="hasSmallBusiness = $event" />
            </div>
            <div v-show="hasSmallBusiness" class="flex items-center gap-2 pl-3">
              <Input
                v-model.number="smallBusinessInMan"
                type="number"
                :min="0"
                :max="84"
                class="w-20 text-right text-xs font-mono"
              />
              <span class="text-xs text-muted-foreground">万円/年 (上限84万)</span>
            </div>
          </div>

          <!-- iDeCo -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <Label class="text-xs">iDeCo</Label>
              <Switch :checked="hasIdeco" @update:checked="hasIdeco = $event" />
            </div>
            <div v-show="hasIdeco" class="flex items-center gap-2 pl-3">
              <Input
                v-model.number="idecoInMan"
                type="number"
                :min="0"
                :max="27.6"
                :step="0.1"
                class="w-20 text-right text-xs font-mono"
              />
              <span class="text-xs text-muted-foreground">万円/年 (上限27.6万)</span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <!-- Layer 3: Other deductions -->
      <div>
        <button
          class="flex w-full items-center justify-between text-xs font-medium py-1"
          @click="showOther = !showOther"
        >
          <span>その他の控除</span>
          <span class="text-muted-foreground">{{ showOther ? '▼' : '▶' }}</span>
        </button>
        <div v-show="showOther" class="space-y-3 mt-2">
          <!-- 生命保険料控除 -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <Label class="text-xs">生命保険料控除</Label>
              <Switch :checked="hasLifeInsurance" @update:checked="hasLifeInsurance = $event" />
            </div>
            <div v-show="hasLifeInsurance" class="flex items-center gap-2 pl-3">
              <Input
                v-model.number="lifeInsuranceInMan"
                type="number"
                :min="0"
                class="w-20 text-right text-xs font-mono"
              />
              <span class="text-xs text-muted-foreground">万円/年 (控除上限: 所得税12万/住民税7万)</span>
            </div>
          </div>

          <!-- 医療費控除 -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <Label class="text-xs">医療費控除</Label>
              <Switch :checked="hasMedical" @update:checked="hasMedical = $event" />
            </div>
            <div v-show="hasMedical" class="flex items-center gap-2 pl-3">
              <Input
                v-model.number="medicalInMan"
                type="number"
                :min="0"
                class="w-20 text-right text-xs font-mono"
              />
              <span class="text-xs text-muted-foreground">万円/年 (10万円超の部分が控除)</span>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
