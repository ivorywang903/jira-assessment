<template>
  <div class="space-y-6">
    <!-- 查詢條件 -->
    <div class="card">
      <h1 class="text-xl font-bold text-gray-900 mb-4">季度考核分析</h1>

      <!-- 期間選擇 -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">查詢期間</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="s in seasons" :key="s.key"
            @click="selectSeason(s.key)"
            class="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            :class="selectedSeason === s.key
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'">
            {{ s.label }}
            <span class="text-xs opacity-70 ml-1">{{ s.range }}</span>
          </button>
          <button
            @click="selectSeason('custom')"
            class="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            :class="selectedSeason === 'custom'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'">
            自訂日期
          </button>
        </div>

        <!-- 自訂日期選擇器 -->
        <div v-if="selectedSeason === 'custom'" class="grid grid-cols-2 gap-3 mt-3 max-w-sm">
          <div>
            <label class="block text-xs text-gray-500 mb-1">開始日期</label>
            <input type="date" v-model="customStart"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">結束日期</label>
            <input type="date" v-model="customEnd"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>

        <!-- 實際查詢區間顯示 -->
        <p class="text-xs text-gray-400 mt-2">
          查詢區間：{{ activeStartDate }} ～ {{ activeEndDate }}
        </p>
      </div>

      <!-- 成員選擇 -->
      <div v-if="config.members.length > 0">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          分析成員
          <span class="text-gray-400 font-normal ml-1">（{{ selectedMembers.length }} / {{ config.members.length }}）</span>
        </label>
        <div class="flex flex-wrap gap-2">
          <button v-for="m in config.members" :key="m.enName"
            @click="toggleMember(m.enName)"
            class="px-3 py-1 rounded-full text-sm border transition-colors"
            :class="selectedMembers.includes(m.enName)
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'">
            {{ m.displayName }}
          </button>
          <button @click="toggleAll"
            class="px-3 py-1 rounded-full text-sm border border-dashed border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600">
            {{ selectedMembers.length === config.members.length ? '取消全選' : '全選' }}
          </button>
        </div>
      </div>
      <div v-else class="text-sm text-yellow-600 bg-yellow-50 rounded-lg p-3">
        請先至「設定」頁面新增成員與 Jira 連線資訊。
      </div>

      <!-- 操作按鈕 -->
      <div class="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
        <button @click="handleRun(false)" :disabled="!canRun || loading" class="btn-primary">
          {{ loading ? '分析中...' : '開始分析' }}
        </button>
        <button
          v-if="isCached && results.length > 0"
          @click="handleRun(true)"
          :disabled="loading"
          class="btn-secondary text-sm flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          重新抓取
        </button>
        <span v-if="isCached && results.length > 0" class="text-xs text-blue-500 flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          資料來自快取
        </span>
      </div>
    </div>

    <!-- 錯誤訊息 -->
    <div v-if="errors.length > 0" class="bg-red-50 border border-red-200 rounded-xl p-4">
      <p class="text-sm font-medium text-red-700 mb-2">以下票據分析失敗：</p>
      <ul class="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
        <li v-for="e in errors" :key="e">{{ e }}</li>
      </ul>
    </div>

    <!-- 統計卡片 -->
    <StatCards v-if="results.length > 0" :stats="summaryStats" />

    <!-- 排名表 -->
    <RankingTable v-if="results.length > 0" :members="results" @show-delay="showDelayMember = $event" />

    <!-- 超時單列表 -->
    <DelayedTickets v-if="allDelayedTickets.length > 0" :tickets="allDelayedTickets" />

    <!-- 空狀態 -->
    <div v-if="!loading && !results.length" class="text-center py-16 text-gray-400">
      <svg class="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p>選擇查詢期間後點擊「開始分析」</p>
    </div>

    <!-- 進度 Overlay -->
    <ProgressOverlay v-if="loading" :progress="progress" />

    <!-- 特定成員延遲單 Modal -->
    <div v-if="showDelayMember"
      class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      @click.self="showDelayMember = null">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900">
            {{ showDelayMember.displayName }} — 超時票據（{{ showDelayMember.delayedTickets.length }} 張）
          </h3>
          <button @click="showDelayMember = null" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="p-6">
          <DelayedTickets :tickets="showDelayMember.delayedTickets" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAssessment } from '@/composables/useAssessment'
import { useConfig } from '@/composables/useConfig'
import StatCards from '@/components/StatCards.vue'
import RankingTable from '@/components/RankingTable.vue'
import DelayedTickets from '@/components/DelayedTickets.vue'
import ProgressOverlay from '@/components/ProgressOverlay.vue'

const { config } = useConfig()
const { loading, progress, results, allTickets, errors, isCached, runAssessment } = useAssessment()

// ── 期間定義 ──────────────────────────────────────────────────
const SEASON_DEFS = [
  { key: 'S1', label: '第一期', start: '01-01', end: '04-30' },
  { key: 'S2', label: '第二期', start: '05-01', end: '08-31' },
  { key: 'S3', label: '第三期', start: '09-01', end: '12-31' },
]

const year = new Date().getFullYear()

const seasons = SEASON_DEFS.map((s) => ({
  ...s,
  range:      `${s.start.replace('-', '/')} – ${s.end.replace('-', '/')}`,
  startDate:  `${year}-${s.start}`,
  endDate:    `${year}-${s.end}`,
  periodKey:  `${year}-${s.key}`,
}))

function currentSeasonKey() {
  const month = new Date().getMonth() + 1
  if (month <= 4)  return 'S1'
  if (month <= 8)  return 'S2'
  return 'S3'
}

// ── 狀態 ──────────────────────────────────────────────────────
const selectedSeason = ref(currentSeasonKey())
const customStart    = ref('')
const customEnd      = ref('')
const selectedMembers = ref(config.value.members.map((m) => m.enName))
const showDelayMember = ref(null)

function selectSeason(key) {
  selectedSeason.value = key
}

// ── 計算屬性 ──────────────────────────────────────────────────
const activeSeason = computed(() =>
  seasons.find((s) => s.key === selectedSeason.value) ?? null
)

const activeStartDate = computed(() =>
  selectedSeason.value === 'custom' ? customStart.value : activeSeason.value?.startDate ?? ''
)

const activeEndDate = computed(() =>
  selectedSeason.value === 'custom' ? customEnd.value : activeSeason.value?.endDate ?? ''
)

const activePeriodKey = computed(() => {
  if (selectedSeason.value === 'custom') {
    return activeStartDate.value && activeEndDate.value
      ? `custom:${activeStartDate.value}_${activeEndDate.value}`
      : null
  }
  return activeSeason.value?.periodKey ?? null
})

const canRun = computed(() =>
  activeStartDate.value &&
  activeEndDate.value &&
  activeStartDate.value <= activeEndDate.value &&
  selectedMembers.value.length > 0 &&
  config.value.jira.baseUrl
)

// ── 成員操作 ──────────────────────────────────────────────────
function toggleMember(enName) {
  const idx = selectedMembers.value.indexOf(enName)
  if (idx >= 0) selectedMembers.value.splice(idx, 1)
  else selectedMembers.value.push(enName)
}

function toggleAll() {
  selectedMembers.value =
    selectedMembers.value.length === config.value.members.length
      ? []
      : config.value.members.map((m) => m.enName)
}

// ── 執行分析 ──────────────────────────────────────────────────
async function handleRun(forceRefresh = false) {
  const members = config.value.members.filter((m) => selectedMembers.value.includes(m.enName))
  await runAssessment({
    members,
    startDate:    activeStartDate.value,
    endDate:      activeEndDate.value,
    repoSlugs:    config.value.repoSlugs,
    period:       activePeriodKey.value,
    forceRefresh,
  })
}

// ── 彙總統計 ──────────────────────────────────────────────────
const allDelayedTickets = computed(() =>
  results.value.flatMap((m) => m.delayedTickets ?? [])
)

const summaryStats = computed(() => ({
  totalTickets:   allTickets.value.length || results.value.reduce((s, m) => s + m.totalTickets, 0),
  memberCount:    results.value.length,
  delayedCount:   allDelayedTickets.value.length,
  nonHumanCount:  allDelayedTickets.value.filter((t) => t.isNonHuman).length,
}))
</script>
