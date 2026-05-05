import { ref, readonly } from 'vue'
import { getAppUser } from '@/services/supabase'

const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME ?? 'admin'
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? ''
const SESSION_KEY    = 'jira_assessment_session'

const session = ref(loadSession())

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSession(data) {
  session.value = data
  if (data) localStorage.setItem(SESSION_KEY, JSON.stringify(data))
  else localStorage.removeItem(SESSION_KEY)
}

/**
 * @returns {{ success: boolean, role: 'admin'|'user'|null, error?: string }}
 */
export async function login(username, password) {
  const hashed = await sha256(password)

  if (username === ADMIN_USERNAME) {
    const adminHash = await sha256(ADMIN_PASSWORD)
    if (hashed === adminHash) {
      saveSession({ username, role: 'admin' })
      return { success: true, role: 'admin' }
    }
    return { success: false, error: '帳號或密碼錯誤' }
  }

  const user = await getAppUser(username)
  if (!user) return { success: false, error: '帳號或密碼錯誤' }
  if (user.token !== hashed) return { success: false, error: '帳號或密碼錯誤' }

  saveSession({ username, role: 'user' })
  return { success: true, role: 'user' }
}

export function logout() {
  saveSession(null)
}

export function useAuth() {
  return {
    session: readonly(session),
    isLoggedIn: () => !!session.value,
    isAdmin:    () => session.value?.role === 'admin',
    isUser:     () => session.value?.role === 'user',
  }
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export { sha256 }
