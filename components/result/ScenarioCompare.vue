<script setup lang="ts">
import { computed, inject, ref, nextTick } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip'
import type { Scenario } from '~/composables/useScenario'

const engine = inject<ReturnType<typeof useTaxEngine>>('taxEngine')!
const scenario = inject<ReturnType<typeof useScenario>>('scenario')!

const editingId = ref<string | null>(null)
const editingName = ref('')
const editInput = ref<HTMLInputElement | null>(null)

function startEdit(s: Scenario) {
  editingId.value = s.id
  editingName.value = s.name
  nextTick(() => editInput.value?.select())
}

function commitEdit() {
  if (editingId.value && editingName.value.trim()) {
    scenario.renameScenario(editingId.value, editingName.value.trim())
  }
  editingId.value = null
}

const fmt = new Intl.NumberFormat('ja-JP')

function formatMan(yen: number): string {
  return `${Math.round(yen / 10_000)}万`
}

function autoName(): string {
  const profit = formatMan(engine.totalProfit.value)
  const monthly = formatMan(engine.monthlyCompensation.value)
  const bonus = formatMan(engine.bonusAmount.value)
  const net = formatMan(engine.result.value.personalNetIncome)
  const parts = [`利益${profit}`, `月額${monthly}`]
  if (engine.bonusAmount.value > 0) parts.push(`賞与${bonus}`)
  parts.push(`手取${net}`)
  return parts.join('_')
}

function handleSave() {
  const r = engine.result.value
  scenario.saveScenario(autoName(), {
    totalProfit: engine.totalProfit.value,
    monthlyCompensation: engine.monthlyCompensation.value,
    bonusAmount: engine.bonusAmount.value,
    bonusCount: engine.bonusCount.value,
    age: engine.age.value,
    prefecture: engine.prefecture.value,
    deductions: { ...engine.deductionSettings.value },
  }, {
    personalNetIncome: r.personalNetIncome,
    corporateRetained: r.corporateRetained,
    totalNetIncome: r.totalNetIncome,
    totalTax: r.totalTax,
    totalSocialInsurance: r.totalSocialInsurance,
  })
}

function handleLoad(s: Scenario) {
  engine.totalProfit.value = s.params.totalProfit
  engine.monthlyCompensation.value = s.params.monthlyCompensation
  engine.bonusAmount.value = s.params.bonusAmount
  engine.bonusCount.value = s.params.bonusCount
  engine.age.value = s.params.age
  engine.prefecture.value = s.params.prefecture
  if (s.params.deductions) {
    engine.deductionSettings.value = s.params.deductions as typeof engine.deductionSettings.value
  }
}

function confirmDeleteAll() {
  if (window.confirm('全シナリオを削除しますか？この操作は取り消せません。')) {
    scenario.deleteAllScenarios()
  }
}
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <CardTitle class="text-sm font-medium">シナリオ比較</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <button type="button" class="inline-flex size-4 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">?</button>
              </TooltipTrigger>
              <TooltipContent>
                <p class="max-w-[240px] text-xs">現在の設定を保存して複数パターンを比較できます。「適用」で保存時の設定に戻せます</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button size="sm" variant="outline" class="h-7 text-xs" @click="handleSave">
          現在の設定を保存
        </Button>
      </div>
    </CardHeader>
    <CardContent class="space-y-3">
      <div
        v-if="scenario.scenarios.value.length === 0"
        class="py-4 text-center text-xs text-muted-foreground"
      >
        保存されたシナリオはありません
      </div>

      <div
        v-for="s in scenario.scenarios.value"
        :key="s.id"
        class="rounded-md border border-border/50 p-3"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <input
              v-if="editingId === s.id"
              ref="editInput"
              v-model="editingName"
              class="w-full rounded border border-border bg-transparent px-1 text-xs font-medium outline-none focus:border-primary"
              @blur="commitEdit"
              @keydown.enter="commitEdit"
              @keydown.escape="editingId = null"
            >
            <p
              v-else
              class="cursor-pointer truncate text-xs font-medium hover:text-primary"
              @click="startEdit(s)"
            >
              {{ s.name }}
            </p>
            <div class="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
              <div class="flex justify-between">
                <span class="text-muted-foreground">利益総額</span>
                <span class="font-mono">
                  {{ fmt.format(s.params.totalProfit) }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">手残り</span>
                <span class="font-mono text-cyan-400">
                  {{ fmt.format(s.result.totalNetIncome) }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">個人</span>
                <span class="font-mono">
                  {{ fmt.format(s.result.personalNetIncome) }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">税合計</span>
                <span class="font-mono text-amber-400">
                  {{ fmt.format(s.result.totalTax) }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">社保</span>
                <span class="font-mono">
                  {{ fmt.format(s.result.totalSocialInsurance) }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="sm"
              class="h-6 px-2 text-[10px]"
              @click="handleLoad(s)"
            >
              適用
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive"
              @click="scenario.deleteScenario(s.id)"
            >
              削除
            </Button>
          </div>
        </div>
      </div>

      <Button
        v-if="scenario.scenarios.value.length > 0"
        variant="ghost"
        size="sm"
        class="w-full text-xs text-muted-foreground"
        @click="confirmDeleteAll"
      >
        全シナリオ削除
      </Button>
    </CardContent>
  </Card>
</template>
