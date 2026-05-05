import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

import Login from './views/Login.vue'
import Dashboard from './views/Dashboard.vue'
import Settings from './views/Settings.vue'
import UserManagement from './views/UserManagement.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login', component: Login, meta: { public: true } },
    { path: '/',       redirect: '/dashboard' },
    { path: '/dashboard', component: Dashboard,      meta: { requireUser: true } },
    { path: '/settings',  component: Settings,       meta: { requireUser: true } },
    { path: '/users',     component: UserManagement, meta: { requireAuth: true } },
  ],
})

router.beforeEach((to) => {
  const raw = localStorage.getItem('jira_assessment_session')
  const session = raw ? JSON.parse(raw) : null
  const role = session?.role ?? null

  if (to.meta.public) {
    // 已登入時直接跳過登入頁
    if (role === 'admin') return '/users'
    if (role === 'user')  return '/dashboard'
    return true
  }

  // 未登入 → 回登入頁
  if (!role) return '/login'

  // requireUser：需要 app_user（admin 無法存取）
  if (to.meta.requireUser && role !== 'user') return '/users'

  // requireAuth：admin + user 都可以
  if (to.meta.requireAuth && !role) return '/login'

  return true
})

createApp(App).use(router).mount('#app')
