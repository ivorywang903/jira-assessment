import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL  ?? ''
const anon = import.meta.env.VITE_SUPABASE_ANON ?? ''

export const supabase = url && anon ? createClient(url, anon) : null

// ── App 帳號 (service = 'app_user') ──────────────────────────

export async function getAppUser(username) {
  if (!supabase) return null
  const { data } = await supabase
    .from('auth_info')
    .select('*')
    .eq('service', 'app_user')
    .eq('username', username)
    .single()
  return data
}

export async function listAppUsers() {
  if (!supabase) return []
  const { data } = await supabase
    .from('auth_info')
    .select('id, username, updated_at')
    .eq('service', 'app_user')
    .order('username')
  return data ?? []
}

export async function upsertAppUser({ username, hashedPassword }) {
  if (!supabase) return { error: 'Supabase 未設定' }
  return supabase.from('auth_info').upsert(
    { service: 'app_user', username, token: hashedPassword, base_url: '' },
    { onConflict: 'service,username' }
  )
}

export async function deleteAppUser(id) {
  if (!supabase) return { error: 'Supabase 未設定' }
  return supabase.from('auth_info').delete().eq('id', id).eq('service', 'app_user')
}

// ── 外部系統設定 (jira / bitbucket) ─────────────────────────

export async function getAuthInfo(service) {
  if (!supabase) return null
  const { data } = await supabase
    .from('auth_info')
    .select('*')
    .eq('service', service)
    .eq('username', 'default')
    .single()
  return data
}

export async function upsertAuthInfo(record) {
  if (!supabase) return { error: 'Supabase 未設定' }
  return supabase
    .from('auth_info')
    .upsert({ ...record, username: 'default' }, { onConflict: 'service,username' })
}

// ── 考核記錄 ─────────────────────────────────────────────────

export async function saveAssessmentRecord(record) {
  if (!supabase) return { error: 'Supabase 未設定' }
  const { data, error } = await supabase
    .from('assessment_records')
    .upsert(record, { onConflict: 'en_name,period' })
    .select()
  return { data, error }
}

/**
 * 查詢指定日期區間 + 成員的考核快取
 * @returns {Array} 有資料的成員記錄（可能少於 enNames.length）
 */
export async function getAssessmentRecords(startDate, endDate, enNames) {
  if (!supabase) return []
  const { data } = await supabase
    .from('assessment_records')
    .select('*')
    .eq('start_date', startDate)
    .eq('end_date', endDate)
    .in('en_name', enNames)
  return data ?? []
}

export async function getProfiles() {
  if (!supabase) return []
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('active', true)
    .order('en_name')
  return data ?? []
}
