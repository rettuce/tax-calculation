<script setup lang="ts">
import { computed, inject } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

const engine = inject<ReturnType<typeof useTaxEngine>>('taxEngine')!

const bonusInMan = computed({
  get: () => Math.round(engine.bonusAmount.value / 10_000),
  set: (v: number) => {
    engine.bonusAmount.value = Math.max(0, v) * 10_000
  },
})

const bonusCountStr = computed({
  get: () => String(engine.bonusCount.value),
  set: (v: string) => {
    const n = Number(v)
    if (n === 1 || n === 2 || n === 3) {
      engine.bonusCount.value = n
    }
  },
})
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <CardTitle class="text-sm font-medium">
        事前確定届出給与
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="flex items-center gap-2">
        <Label for="bonus-input" class="sr-only">賞与額</Label>
        <Input
          id="bonus-input"
          v-model.number="bonusInMan"
          type="number"
          :min="0"
          class="w-28 text-right text-lg font-mono"
        />
        <span class="shrink-0 text-sm text-muted-foreground">万円/年</span>
      </div>

      <div class="flex items-center gap-2">
        <Label class="text-xs text-muted-foreground">支給回数</Label>
        <Select v-model="bonusCountStr">
          <SelectTrigger class="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1回</SelectItem>
            <SelectItem value="2">2回</SelectItem>
            <SelectItem value="3">3回</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </CardContent>
  </Card>
</template>
