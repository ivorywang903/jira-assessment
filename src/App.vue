<template>
  <div class="min-h-screen">
    <!-- 登入頁不顯示 Navbar -->
    <nav v-if="!isLoginPage" class="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span class="font-bold text-gray-900 text-lg">季度考核分析系統</span>
          </div>

          <!-- 導覽連結 -->
          <div class="flex items-center gap-1">
            <!-- app_user 才看得到 -->
            <template v-if="isUser">
              <router-link to="/dashboard" class="nav-link" :class="{ active: $route.path === '/dashboard' }">
                Dashboard
              </router-link>
              <router-link to="/settings" class="nav-link" :class="{ active: $route.path === '/settings' }">
                設定
              </router-link>
            </template>

            <!-- admin + user 都看得到 -->
            <router-link to="/users" class="nav-link" :class="{ active: $route.path === '/users' }">
              帳號管理
            </router-link>

            <!-- 使用者資訊 + 登出 -->
            <div class="ml-4 flex items-center gap-3 border-l border-gray-200 pl-4">
              <div class="text-sm">
                <span class="text-gray-500">{{ session?.username }}</span>
                <span class="ml-1.5 text-xs px-1.5 py-0.5 rounded"
                  :class="isAdmin ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'">
                  {{ isAdmin ? 'admin' : 'user' }}
                </span>
              </div>
              <button @click="handleLogout"
                class="text-sm text-gray-400 hover:text-gray-700 transition-colors">
                登出
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <main :class="isLoginPage ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth, logout } from '@/composables/useAuth'

const route  = useRoute()
const router = useRouter()
const { session, isAdmin, isUser } = useAuth()

const isLoginPage = computed(() => route.path === '/login')

function handleLogout() {
  logout()
  router.push('/login')
}
</script>

<style scoped>
.nav-link {
  @apply px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors;
}
.nav-link.active {
  @apply bg-blue-50 text-blue-700;
}
</style>
