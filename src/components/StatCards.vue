<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="card py-4">
      <div class="text-sm text-gray-500">總票據數</div>
      <div class="text-3xl font-bold text-gray-900 mt-1">{{ stats.totalTickets }}</div>
    </div>
    <div class="card py-4">
      <div class="text-sm text-gray-500">分析人數</div>
      <div class="text-3xl font-bold text-blue-600 mt-1">{{ stats.memberCount }}</div>
    </div>
    <div class="card py-4">
      <div class="text-sm text-gray-500">超時票據</div>
      <div class="text-3xl font-bold mt-1" :class="stats.delayedCount > 0 ? 'text-red-500' : 'text-gray-400'">
        {{ stats.delayedCount }}
      </div>
    </div>
    <div class="card py-4">
      <div class="text-sm text-gray-500">非人為延遲</div>
      <div class="text-3xl font-bold text-blue-500 mt-1">{{ stats.nonHumanCount }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  stats: {
    type: Object,
    default: () => ({ totalTickets: 0, memberCount: 0, delayedCount: 0, nonHumanCount: 0 }),
  },
})
</script>
