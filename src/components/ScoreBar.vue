<template>
  <div class="flex items-center justify-end gap-2">
    <div class="w-16 bg-gray-100 rounded-full h-1.5">
      <div class="h-1.5 rounded-full transition-all" :class="barClass" :style="{ width: `${score}%` }"></div>
    </div>
    <span class="text-sm font-medium w-8 text-right" :class="textClass">{{ score }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ score: Number, color: { type: String, default: 'blue' } })
const barClass = computed(() => ({
  blue:   'bg-blue-500',
  green:  'bg-green-500',
  purple: 'bg-purple-500',
}[props.color]))
const textClass = computed(() => ({
  blue:   'text-blue-600',
  green:  'text-green-600',
  purple: 'text-purple-600',
}[props.color]))
</script>
