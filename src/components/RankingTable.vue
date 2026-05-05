<template>
  <div class="card">
    <h2 class="text-lg font-semibold text-gray-900 mb-4">綜合排名</h2>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200">
            <th class="text-left py-3 px-2 font-medium text-gray-500 w-12">排名</th>
            <th class="text-left py-3 px-2 font-medium text-gray-500">姓名</th>
            <th class="text-right py-3 px-2 font-medium text-gray-500">完單數</th>
            <th class="text-right py-3 px-2 font-medium text-gray-500">代碼變動</th>
            <th class="text-right py-3 px-2 font-medium text-gray-500">平均工作天</th>
            <th class="text-right py-3 px-2 font-medium text-gray-500">PR評論密度</th>
            <th class="text-right py-3 px-2 font-medium text-gray-500">超時單</th>
            <th class="text-right py-3 px-2 font-medium text-gray-500 w-24">產出分</th>
            <th class="text-right py-3 px-2 font-medium text-gray-500 w-24">效率分</th>
            <th class="text-right py-3 px-2 font-medium text-gray-500 w-24">品質分</th>
            <th class="text-right py-3 px-2 font-medium text-gray-500 w-24">總分</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in members" :key="member.enName"
            class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
            <td class="py-3 px-2">
              <span class="font-bold" :class="rankColor(member.rank)">
                {{ member.rank <= 3 ? ['🥇', '🥈', '🥉'][member.rank - 1] : `#${member.rank}` }}
              </span>
            </td>
            <td class="py-3 px-2">
              <div class="font-medium text-gray-900">{{ member.displayName }}</div>
              <div class="text-xs text-gray-400">{{ member.enName }}</div>
            </td>
            <td class="py-3 px-2 text-right font-medium">{{ member.totalTickets }}</td>
            <td class="py-3 px-2 text-right">
              <span class="text-gray-700">{{ formatNumber(member.totalCodeChanges) }}</span>
              <span class="text-gray-400 text-xs ml-1">行</span>
            </td>
            <td class="py-3 px-2 text-right">
              <span :class="leadTimeColor(member.adjustedLeadTime)">
                {{ member.adjustedLeadTime }}
              </span>
              <span class="text-gray-400 text-xs ml-1">天</span>
              <div v-if="member.avgLeadTime !== member.adjustedLeadTime" class="text-xs text-gray-400">
                (原 {{ member.avgLeadTime }} 天)
              </div>
            </td>
            <td class="py-3 px-2 text-right">{{ member.prCommentDensity }}</td>
            <td class="py-3 px-2 text-right">
              <span v-if="member.delayedTickets.length > 0"
                class="badge-red cursor-pointer" @click="$emit('show-delay', member)">
                {{ member.delayedTickets.length }} 張
              </span>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="py-3 px-2 text-right">
              <ScoreBar :score="member.outputScore" color="blue" />
            </td>
            <td class="py-3 px-2 text-right">
              <ScoreBar :score="member.efficiencyScore" color="green" />
            </td>
            <td class="py-3 px-2 text-right">
              <ScoreBar :score="member.qualityScore" color="purple" />
            </td>
            <td class="py-3 px-2 text-right">
              <span class="text-lg font-bold" :class="scoreColor(member.finalScore)">
                {{ member.finalScore }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- 權重說明 -->
    <div class="mt-4 flex gap-4 text-xs text-gray-500 border-t border-gray-100 pt-4">
      <span class="flex items-center gap-1">
        <span class="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>產出 40%
      </span>
      <span class="flex items-center gap-1">
        <span class="w-2 h-2 rounded-full bg-green-400 inline-block"></span>效率 30%
      </span>
      <span class="flex items-center gap-1">
        <span class="w-2 h-2 rounded-full bg-purple-400 inline-block"></span>品質 30%
      </span>
      <span class="text-gray-400 ml-auto">* 效率分已排除非人為延遲異常單</span>
    </div>
  </div>
</template>

<script setup>
import ScoreBar from './ScoreBar.vue'

defineProps({ members: { type: Array, default: () => [] } })
defineEmits(['show-delay'])

function rankColor(rank) {
  if (rank === 1) return 'text-yellow-500'
  if (rank === 2) return 'text-gray-400'
  if (rank === 3) return 'text-amber-600'
  return 'text-gray-500'
}
function leadTimeColor(days) {
  if (days <= 5) return 'text-green-600 font-medium'
  if (days <= 10) return 'text-yellow-600 font-medium'
  return 'text-red-600 font-medium'
}
function scoreColor(score) {
  if (score >= 70) return 'text-green-600'
  if (score >= 50) return 'text-yellow-600'
  return 'text-red-600'
}
function formatNumber(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n
}
</script>
