<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-gray-900">
        超過 10 工作天異常單
        <span class="ml-2 badge-red">{{ tickets.length }} 張</span>
      </h2>
      <div class="flex gap-2">
        <button
          v-for="f in filters" :key="f.value"
          @click="activeFilter = f.value"
          class="text-xs px-3 py-1 rounded-full border transition-colors"
          :class="activeFilter === f.value
            ? 'bg-gray-800 text-white border-gray-800'
            : 'border-gray-200 text-gray-600 hover:border-gray-400'">
          {{ f.label }}
        </button>
      </div>
    </div>

    <div v-if="!tickets.length" class="text-center py-8 text-gray-400">
      無超時票據
    </div>

    <div v-else class="space-y-3">
      <div v-for="t in filteredTickets" :key="t.key"
        class="border rounded-lg p-4 transition-colors"
        :class="t.isNonHuman ? 'border-blue-100 bg-blue-50/50' : 'border-red-100 bg-red-50/50'">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-mono font-bold text-gray-800">{{ t.key }}</span>
              <span :class="t.isNonHuman ? 'badge-blue' : 'badge-red'">
                {{ t.isNonHuman ? '非人為因素' : '人為延遲' }}
              </span>
              <span v-for="r in t.delayReasons" :key="r" class="badge-yellow">{{ categoryLabel(r) }}</span>
            </div>
            <p class="text-sm text-gray-700 mt-1 truncate">{{ t.summary }}</p>
            <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>開發者：<strong class="text-gray-700">{{ t.assignee }}</strong></span>
              <span v-if="t.implementDate">Implement：{{ formatDate(t.implementDate) }}</span>
              <span v-if="t.rdTestDate">RD TEST：{{ formatDate(t.rdTestDate) }}</span>
            </div>
          </div>
          <div class="text-right shrink-0">
            <div class="text-2xl font-bold" :class="t.isNonHuman ? 'text-blue-600' : 'text-red-600'">
              {{ t.leadTime }}
            </div>
            <div class="text-xs text-gray-500">工作天</div>
          </div>
        </div>
        <div v-if="t.delaySummary && t.delaySummary !== '無說明'"
          class="mt-3 text-xs text-gray-600 bg-white rounded p-2 border border-gray-100">
          <span class="font-medium text-gray-700">Comment 摘要：</span>
          <span class="whitespace-pre-wrap">{{ t.delaySummary }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { categoryLabel } from '@/services/delayAnalyzer'

const props = defineProps({ tickets: { type: Array, default: () => [] } })

const activeFilter = ref('all')
const filters = [
  { label: '全部', value: 'all' },
  { label: '非人為', value: 'non-human' },
  { label: '人為延遲', value: 'human' },
]

const filteredTickets = computed(() => {
  const sorted = [...props.tickets].sort((a, b) => (b.leadTime ?? 0) - (a.leadTime ?? 0))
  if (activeFilter.value === 'non-human') return sorted.filter((t) => t.isNonHuman)
  if (activeFilter.value === 'human') return sorted.filter((t) => !t.isNonHuman)
  return sorted
})

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }) : ''
}
</script>
