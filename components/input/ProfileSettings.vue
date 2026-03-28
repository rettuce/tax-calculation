<script setup lang="ts">
import { ref, inject } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible'
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

const isOpen = ref(false)

const prefectures = [
  { value: 'tokyo', label: '東京都' },
]
</script>

<template>
  <Card>
    <Collapsible v-model:open="isOpen">
      <CardHeader class="pb-3">
        <CollapsibleTrigger class="flex w-full items-center justify-between">
          <CardTitle class="text-sm font-medium">
            プロフィール設定
          </CardTitle>
          <span class="text-xs text-muted-foreground">
            {{ isOpen ? '閉じる' : '開く' }}
          </span>
        </CollapsibleTrigger>
      </CardHeader>
      <CollapsibleContent>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label for="age-input">年齢</Label>
            <Input
              id="age-input"
              v-model.number="engine.age.value"
              type="number"
              :min="18"
              :max="100"
              class="w-24 text-right font-mono"
            />
          </div>

          <div class="space-y-2">
            <Label>都道府県</Label>
            <Select v-model="engine.prefecture.value">
              <SelectTrigger class="w-40">
                <SelectValue placeholder="都道府県を選択" />
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
        </CardContent>
      </CollapsibleContent>
    </Collapsible>
  </Card>
</template>
