<template>
  <div class="space-y-6">
    <!-- Jira -->
    <div class="card">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Jira 連線設定</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
          <input v-model="config.jira.baseUrl" placeholder="http://jira.company.local:8080" class="input" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input v-model="config.jira.username" class="input" />
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Password / API Token</label>
          <input v-model="config.jira.token" type="password" class="input" />
        </div>
        <div class="md:col-span-2">
          <button @click="testJira" :disabled="testingJira" class="btn-secondary text-sm">
            {{ testingJira ? '測試中...' : '測試連線' }}
          </button>
          <span v-if="jiraTestResult" class="ml-3 text-sm"
            :class="jiraTestResult.ok ? 'text-green-600' : 'text-red-600'">
            {{ jiraTestResult.msg }}
          </span>
        </div>
      </div>
    </div>

    <!-- Bitbucket Server -->
    <div class="card">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Bitbucket Server 連線設定</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
          <input v-model="config.bitbucket.baseUrl" placeholder="http://bitbucket.company.local:7990" class="input" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input v-model="config.bitbucket.username" class="input" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password / HTTP Access Token</label>
          <input v-model="config.bitbucket.token" type="password" class="input" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Project Key
            <span class="text-gray-400 font-normal text-xs ml-1">（專案縮寫，如 GCMS）</span>
          </label>
          <input v-model="config.bitbucket.projectKey" placeholder="GCMS" class="input" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Repo Slugs
            <span class="text-gray-400 font-normal text-xs ml-1">（逗號分隔）</span>
          </label>
          <input v-model="repoSlugsInput" placeholder="gcms3-api, gcms3-view" class="input" />
        </div>
        <div class="md:col-span-2">
          <button @click="testBitbucket" :disabled="testingBb" class="btn-secondary text-sm">
            {{ testingBb ? '測試中...' : '測試連線' }}
          </button>
          <span v-if="bbTestResult" class="ml-3 text-sm"
            :class="bbTestResult.ok ? 'text-green-600' : 'text-red-600'">
            {{ bbTestResult.msg }}
          </span>
        </div>
      </div>
    </div>

    <!-- 成員管理 -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900">成員管理</h2>
        <button @click="addMember" class="btn-secondary text-sm">+ 新增成員</button>
      </div>
      <div class="space-y-2">
        <div v-for="(m, i) in config.members" :key="i"
          class="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
          <div class="flex-1 grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-0.5">英文名（Jira assignee）</label>
              <input v-model="m.enName" placeholder="john.doe" class="input text-sm py-1.5" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-0.5">顯示名稱</label>
              <input v-model="m.displayName" placeholder="John Doe" class="input text-sm py-1.5" />
            </div>
          </div>
          <button @click="removeMember(i)" class="text-gray-300 hover:text-red-500 transition-colors shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div v-if="!config.members.length" class="text-center py-6 text-gray-400 text-sm">
          尚未新增成員
        </div>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button @click="handleSave" class="btn-primary">儲存設定</button>
      <span v-if="saved" class="text-sm text-green-600">✓ 已儲存</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useConfig } from '@/composables/useConfig'
import { configureJira } from '@/services/jiraApi'

const { config, saveConfig } = useConfig()
const saved = ref(false)
const repoSlugsInput = ref((config.value.repoSlugs ?? []).join(', '))

watch(repoSlugsInput, (v) => {
  config.value.repoSlugs = v.split(',').map((s) => s.trim()).filter(Boolean)
})

// ── 連線測試 ──────────────────────────────────────────

const testingJira    = ref(false)
const jiraTestResult = ref(null)
const testingBb      = ref(false)
const bbTestResult   = ref(null)

async function testJira() {
  jiraTestResult.value = null
  testingJira.value = true
  try {
    const { baseUrl, username, token } = config.value.jira
    if (!baseUrl || !username || !token) throw new Error('請填寫所有欄位')
    const url = new URL('/api-proxy/rest/api/2/myself', window.location.origin)
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Basic ${btoa(`${username}:${token}`)}`,
        'X-Proxy-Target': baseUrl.replace(/\/$/, ''),
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    jiraTestResult.value = { ok: true, msg: `連線成功（${data.displayName ?? data.name}）` }
  } catch (e) {
    jiraTestResult.value = { ok: false, msg: `連線失敗：${e.message}` }
  } finally {
    testingJira.value = false
  }
}

async function testBitbucket() {
  bbTestResult.value = null
  testingBb.value = true
  try {
    const { baseUrl, username, token, projectKey } = config.value.bitbucket
    if (!baseUrl || !username || !token) throw new Error('請填寫所有欄位')
    const path = projectKey
      ? `/api-proxy/rest/api/1.0/projects/${projectKey}`
      : `/api-proxy/rest/api/1.0/application-properties`
    const res = await fetch(new URL(path, window.location.origin).toString(), {
      headers: {
        Authorization: `Basic ${btoa(`${username}:${token}`)}`,
        'X-Proxy-Target': baseUrl.replace(/\/$/, ''),
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    bbTestResult.value = { ok: true, msg: '連線成功' }
  } catch (e) {
    bbTestResult.value = { ok: false, msg: `連線失敗：${e.message}` }
  } finally {
    testingBb.value = false
  }
}

// ── 儲存 ──────────────────────────────────────────────

function addMember() { config.value.members.push({ enName: '', displayName: '' }) }
function removeMember(i) { config.value.members.splice(i, 1) }

function handleSave() {
  saveConfig()
  saved.value = true
  setTimeout(() => (saved.value = false), 2000)
}
</script>

<style scoped>
.input {
  @apply w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none
         focus:ring-2 focus:ring-blue-500 focus:border-transparent transition;
}
</style>
