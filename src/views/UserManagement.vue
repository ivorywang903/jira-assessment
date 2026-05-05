<template>
  <div class="space-y-6">
    <div class="card">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">帳號管理</h2>
          <p class="text-sm text-gray-500 mt-0.5">管理可登入系統的使用者帳號</p>
        </div>
        <button @click="showForm = true" class="btn-primary text-sm">+ 新增帳號</button>
      </div>

      <!-- 新增帳號表單 -->
      <div v-if="showForm" class="border border-blue-100 bg-blue-50/50 rounded-xl p-5 mb-6">
        <h3 class="font-medium text-gray-800 mb-4">新增使用者帳號</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">帳號</label>
            <input v-model="form.username" placeholder="輸入帳號" class="input"
              :class="{ 'border-red-400': formError }" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">密碼</label>
            <input v-model="form.password" type="password" placeholder="輸入密碼" class="input" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">確認密碼</label>
            <input v-model="form.confirm" type="password" placeholder="再次輸入密碼" class="input" />
          </div>
        </div>
        <p v-if="formError" class="text-sm text-red-600 mt-2">{{ formError }}</p>
        <div class="flex gap-3 mt-4">
          <button @click="handleCreate" :disabled="saving" class="btn-primary text-sm">
            {{ saving ? '儲存中...' : '儲存' }}
          </button>
          <button @click="cancelForm" class="btn-secondary text-sm">取消</button>
        </div>
      </div>

      <!-- 帳號列表 -->
      <div v-if="loading" class="text-center py-8 text-gray-400 text-sm">載入中...</div>
      <div v-else-if="!supabaseReady" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
        尚未設定 Supabase，帳號資料無法持久化。請在 <code>.env</code> 中設定 <code>VITE_SUPABASE_URL</code> 與 <code>VITE_SUPABASE_ANON</code>。
      </div>
      <div v-else-if="!users.length" class="text-center py-8 text-gray-400 text-sm">
        尚未建立任何使用者帳號
      </div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200">
            <th class="text-left py-3 px-2 font-medium text-gray-500">帳號</th>
            <th class="text-left py-3 px-2 font-medium text-gray-500">最後更新</th>
            <th class="py-3 px-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id" class="border-b border-gray-50 hover:bg-gray-50">
            <td class="py-3 px-2 font-medium">{{ u.username }}</td>
            <td class="py-3 px-2 text-gray-500">{{ formatDate(u.updated_at) }}</td>
            <td class="py-3 px-2 text-right">
              <button @click="handleDelete(u)"
                class="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1">
                刪除
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 提示 -->
      <div class="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-400 space-y-1">
        <p>• <strong class="text-gray-500">admin</strong> 為內建帳號，登入後只能管理使用者帳號。</p>
        <p>• 此頁面建立的帳號可使用 Dashboard、設定等完整功能。</p>
        <p>• 密碼以 SHA-256 雜湊後儲存。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase, listAppUsers, upsertAppUser, deleteAppUser } from '@/services/supabase'
import { sha256 } from '@/composables/useAuth'

const supabaseReady = !!supabase
const loading = ref(false)
const saving  = ref(false)
const users   = ref([])
const showForm = ref(false)
const formError = ref('')

const form = ref({ username: '', password: '', confirm: '' })

onMounted(fetchUsers)

async function fetchUsers() {
  loading.value = true
  users.value = await listAppUsers()
  loading.value = false
}

function cancelForm() {
  showForm.value = false
  form.value = { username: '', password: '', confirm: '' }
  formError.value = ''
}

async function handleCreate() {
  formError.value = ''
  const { username, password, confirm } = form.value
  if (!username.trim()) { formError.value = '請輸入帳號'; return }
  if (username.trim() === 'admin') { formError.value = '不可使用保留帳號 admin'; return }
  if (!password) { formError.value = '請輸入密碼'; return }
  if (password !== confirm) { formError.value = '兩次密碼不一致'; return }
  if (users.value.some((u) => u.username === username.trim())) {
    formError.value = '帳號已存在'; return
  }

  saving.value = true
  const hashedPassword = await sha256(password)
  const { error } = await upsertAppUser({ username: username.trim(), hashedPassword })
  saving.value = false

  if (error) { formError.value = `儲存失敗：${error.message ?? error}`; return }
  cancelForm()
  await fetchUsers()
}

async function handleDelete(user) {
  if (!confirm(`確定刪除帳號「${user.username}」？`)) return
  await deleteAppUser(user.id)
  await fetchUsers()
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>

<style scoped>
.input {
  @apply w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none
         focus:ring-2 focus:ring-blue-500 focus:border-transparent transition;
}
</style>
