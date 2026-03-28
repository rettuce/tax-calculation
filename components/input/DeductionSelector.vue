<script setup lang="ts">
import { computed, inject } from 'vue'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Switch } from '~/components/ui/switch'

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

function getBasicDeduction(employmentIncome: number): number {
  // Approximate from result: incomeTaxDeductions includes basic + social + others
  // We show a simplified version here
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

// Layer 2: Main deduction switches
const hasSpouse = computed({
  get: () => engine.deductionSettings.value.spouseIncome !== undefined,
  set: (v: boolean) => {
    engine.deductionSettings.value = {
      ...engine.deductionSettings.value,
      spouseIncome: v ? 0 : undefined,
    }
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

const smallBusinessAmount = computed({
  get: () => Math.round((engine.deductionSettings.value.smallBusinessMutualAid ?? 0) / 10_000),
  set: (v: number) => {
    engine.deductionSettings.value = {
      ...engine.deductionSettings.value,
      smallBusinessMutualAid: Math.max(0, v) * 10_000,
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

const idecoAmount = computed({
  get: () => Math.round((engine.deductionSettings.value.ideco ?? 0) / 10_000),
  set: (v: number) => {
    engine.deductionSettings.value = {
      ...engine.deductionSettings.value,
      ideco: Math.max(0, v) * 10_000,
    }
  },
})

// Layer 3: Other deductions
const hasLifeInsurance = computed({
  get: () => (engine.deductionSettings.value.lifeInsurancePremium ?? 0) > 0,
  set: (v: boolean) => {
    engine.deductionSettings.value = {
      ...engine.deductionSettings.value,
      lifeInsurancePremium: v ? 100_000 : 0,
    }
  },
})

const lifeInsuranceAmount = computed({
  get: () => Math.round((engine.deductionSettings.value.lifeInsurancePremium ?? 0) / 10_000),
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

const medicalAmount = computed({
  get: () => Math.round((engine.deductionSettings.value.medicalExpense ?? 0) / 10_000),
  set: (v: number) => {
    engine.deductionSettings.value = {
      ...engine.deductionSettings.value,
      medicalExpense: Math.max(0, v) * 10_000,
    }
  },
})
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <CardTitle class="text-sm font-medium">控除設定</CardTitle>
    </CardHeader>
    <CardContent>
      <Accordion type="multiple" class="w-full">
        <!-- Layer 1: Auto deductions -->
        <AccordionItem value="auto">
          <AccordionTrigger class="text-xs">自動控除</AccordionTrigger>
          <AccordionContent>
            <div class="space-y-1.5">
              <div
                v-for="item in autoDeductions"
                :key="item.label"
                class="flex items-center justify-between text-xs"
              >
                <span class="text-muted-foreground">{{ item.label }}</span>
                <span class="font-mono">{{ fmt.format(item.amount) }}円</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <!-- Layer 2: Main deductions -->
        <AccordionItem value="main">
          <AccordionTrigger class="text-xs">主要控除</AccordionTrigger>
          <AccordionContent>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <Label class="text-xs">配偶者控除</Label>
                <Switch :checked="hasSpouse" @update:checked="hasSpouse = $event" />
              </div>

              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <Label class="text-xs">小規模企業共済</Label>
                  <Switch :checked="hasSmallBusiness" @update:checked="hasSmallBusiness = $event" />
                </div>
                <div v-if="hasSmallBusiness" class="flex items-center gap-2 pl-4">
                  <Input
                    v-model.number="smallBusinessAmount"
                    type="number"
                    :min="0"
                    class="w-24 text-right text-xs font-mono"
                  />
                  <span class="text-xs text-muted-foreground">万円/年</span>
                </div>
              </div>

              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <Label class="text-xs">iDeCo</Label>
                  <Switch :checked="hasIdeco" @update:checked="hasIdeco = $event" />
                </div>
                <div v-if="hasIdeco" class="flex items-center gap-2 pl-4">
                  <Input
                    v-model.number="idecoAmount"
                    type="number"
                    :min="0"
                    class="w-24 text-right text-xs font-mono"
                  />
                  <span class="text-xs text-muted-foreground">万円/年</span>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <!-- Layer 3: Other deductions -->
        <AccordionItem value="other">
          <AccordionTrigger class="text-xs">その他</AccordionTrigger>
          <AccordionContent>
            <div class="space-y-4">
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <Label class="text-xs">生命保険料控除</Label>
                  <Switch :checked="hasLifeInsurance" @update:checked="hasLifeInsurance = $event" />
                </div>
                <div v-if="hasLifeInsurance" class="flex items-center gap-2 pl-4">
                  <Input
                    v-model.number="lifeInsuranceAmount"
                    type="number"
                    :min="0"
                    class="w-24 text-right text-xs font-mono"
                  />
                  <span class="text-xs text-muted-foreground">万円/年</span>
                </div>
              </div>

              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <Label class="text-xs">医療費控除</Label>
                  <Switch :checked="hasMedical" @update:checked="hasMedical = $event" />
                </div>
                <div v-if="hasMedical" class="flex items-center gap-2 pl-4">
                  <Input
                    v-model.number="medicalAmount"
                    type="number"
                    :min="0"
                    class="w-24 text-right text-xs font-mono"
                  />
                  <span class="text-xs text-muted-foreground">万円/年</span>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </CardContent>
  </Card>
</template>
