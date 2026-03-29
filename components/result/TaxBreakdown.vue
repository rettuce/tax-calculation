<script setup lang="ts">
import { computed, inject } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip'
import { calculateCorporateTaxes } from '~/utils/corporate-tax-calculator'

const engine = inject<ReturnType<typeof useTaxEngine>>('taxEngine')!

const fmt = new Intl.NumberFormat('ja-JP')

const r = computed(() => engine.result.value)

// Get detailed corporate tax breakdown
const corpDetail = computed(() => {
  const corpIncome = r.value.corporateIncome
  return calculateCorporateTaxes(corpIncome, { capital: 10_000_000, employees: 1 })
})

const personalRows = computed(() => [
  { label: '所得税', amount: r.value.incomeTax },
  { label: '住民税', amount: r.value.residentTax },
  { label: '社保（本人負担）', amount: r.value.socialInsurance.employeeAnnual },
])

const personalTotal = computed(
  () => r.value.incomeTax + r.value.residentTax + r.value.socialInsurance.employeeAnnual,
)

const corporateRows = computed(() => [
  { label: '法人税', amount: corpDetail.value.corporateTax },
  { label: '地方法人税', amount: corpDetail.value.localCorporateTax },
  { label: '法人住民税（税割）', amount: corpDetail.value.inhabitantTax },
  { label: '法人事業税', amount: corpDetail.value.businessTax },
  { label: '特別法人事業税', amount: corpDetail.value.specialBusinessTax },
  { label: '均等割', amount: corpDetail.value.flatRate },
  { label: '社保（会社負担）', amount: r.value.socialInsurance.employerAnnual },
])

const corporateTotal = computed(
  () => corpDetail.value.totalTax + r.value.socialInsurance.employerAnnual,
)
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <div class="flex items-center gap-1.5">
        <CardTitle class="text-sm font-medium">税金内訳</CardTitle>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <button type="button" class="inline-flex size-4 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">?</button>
            </TooltipTrigger>
            <TooltipContent>
              <p class="max-w-[240px] text-xs">個人と法人それぞれの税金・社保の詳細な内訳です</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </CardHeader>
    <CardContent>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <!-- Personal -->
        <div class="space-y-2">
          <p class="text-xs font-medium text-cyan-400">個人の税金</p>
          <div
            v-for="row in personalRows"
            :key="row.label"
            class="flex items-center justify-between text-xs"
          >
            <span class="text-muted-foreground">{{ row.label }}</span>
            <span class="font-mono tabular-nums">{{ fmt.format(row.amount) }}</span>
          </div>
          <Separator />
          <div class="flex items-center justify-between text-xs font-medium">
            <span>合計</span>
            <span class="font-mono tabular-nums text-amber-400">
              {{ fmt.format(personalTotal) }}
            </span>
          </div>
        </div>

        <!-- Corporate -->
        <div class="space-y-2">
          <p class="text-xs font-medium text-teal-400">法人の税金</p>
          <div
            v-for="row in corporateRows"
            :key="row.label"
            class="flex items-center justify-between text-xs"
          >
            <span class="text-muted-foreground">{{ row.label }}</span>
            <span class="font-mono tabular-nums">{{ fmt.format(row.amount) }}</span>
          </div>
          <Separator />
          <div class="flex items-center justify-between text-xs font-medium">
            <span>合計</span>
            <span class="font-mono tabular-nums text-amber-400">
              {{ fmt.format(corporateTotal) }}
            </span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
