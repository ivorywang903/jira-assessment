<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">季度考核分析系統</h1>
        <p class="text-slate-400 text-sm mt-1">請登入後繼續</p>
      </div>

      <!-- 表單 -->
      <form @submit.prevent="handleLogin"
        class="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">帳號</label>
          <input
            v-model="username"
            type="text"
            autocomplete="username"
            placeholder="輸入帳號"
            class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            :disabled="loading" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">密碼</label>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="輸入密碼"
            class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            :disabled="loading" />
        </div>

        <div v-if="errorMsg" class="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">
          {{ errorMsg }}
        </div>

        <button
          type="submit"
          :disabled="loading || !username || !password"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                 text-white font-medium py-2.5 rounded-lg transition-colors text-sm">
          {{ loading ? '登入中...' : '登入' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '@/composables/useAuth'

const router = useRouter()
const username = ref('')
const password = ref('')
const loading  = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  errorMsg.value = ''
  loading.value = true
  try {
    const result = await login(username.value.trim(), password.value)
    if (result.success) {
      router.push(result.role === 'admin' ? '/users' : '/dashboard')
    } else {
      errorMsg.value = result.error
    }
  } finally {
    loading.value = false
  }
}
</script>
