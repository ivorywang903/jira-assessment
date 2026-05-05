<template>
  <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl shadow-xl p-8 w-96 max-w-full mx-4">
      <div class="text-center mb-6">
        <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h3 class="font-semibold text-gray-900">分析中...</h3>
        <p class="text-sm text-gray-500 mt-1">{{ progress.message }}</p>
      </div>
      <div v-if="progress.total > 0">
        <div class="flex justify-between text-xs text-gray-500 mb-1">
          <span>{{ progress.current }} / {{ progress.total }}</span>
          <span>{{ pct }}%</span>
        </div>
        <div class="w-full bg-gray-100 rounded-full h-2">
          <div class="bg-blue-600 h-2 rounded-full transition-all" :style="{ width: `${pct}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ progress: Object })
const pct = computed(() =>
  props.progress.total > 0
    ? Math.round((props.progress.current / props.progress.total) * 100)
    : 0
)
</script>
