<script setup lang="ts">
import { computed, ref, inject } from 'vue'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'

const engine = inject<ReturnType<typeof useTaxEngine>>('taxEngine')!

const MAX_VISIBLE = 3
const showAll = ref(false)

const warnings = computed(() => engine.warnings.value)

const visibleWarnings = computed(() => {
  if (showAll.value) return warnings.value
  return warnings.value.slice(0, MAX_VISIBLE)
})

const hiddenCount = computed(
  () => Math.max(0, warnings.value.length - MAX_VISIBLE),
)

function levelClass(level: string) {
  switch (level) {
    case 'critical':
      return 'border-red-500/50 bg-red-500/10 text-red-400'
    case 'warning':
      return 'border-amber-500/50 bg-amber-500/10 text-amber-400'
    case 'info':
      return 'text-muted-foreground'
    default:
      return ''
  }
}
</script>

<template>
  <div v-if="warnings.length > 0" class="space-y-2">
    <template v-for="w in visibleWarnings" :key="w.id">
      <!-- Critical: full banner -->
      <div
        v-if="w.level === 'critical'"
        :class="levelClass(w.level)"
        class="rounded-md border px-3 py-2 text-sm"
      >
        {{ w.message }}
      </div>

      <!-- Warning: badge inline -->
      <div
        v-else-if="w.level === 'warning'"
        class="flex items-center gap-2"
      >
        <Badge variant="outline" class="border-amber-500/50 text-amber-400">
          注意
        </Badge>
        <span class="text-xs text-amber-300/80">{{ w.message }}</span>
      </div>

      <!-- Info: small text -->
      <p
        v-else
        class="flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <span class="inline-block size-1 rounded-full bg-muted-foreground/50" />
        {{ w.message }}
      </p>
    </template>

    <Button
      v-if="hiddenCount > 0 && !showAll"
      variant="ghost"
      size="sm"
      class="h-6 px-2 text-xs text-muted-foreground"
      @click="showAll = true"
    >
      他{{ hiddenCount }}件を表示
    </Button>
    <Button
      v-if="showAll && warnings.length > MAX_VISIBLE"
      variant="ghost"
      size="sm"
      class="h-6 px-2 text-xs text-muted-foreground"
      @click="showAll = false"
    >
      折りたたむ
    </Button>
  </div>
</template>
