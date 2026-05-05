/**
 * Bitbucket Server / Data Center API 整合服務
 * REST API 1.0，路徑：/projects/{projectKey}/repos/{repo}
 * 所有請求透過 /api-proxy 轉發，解決地端 CORS 問題。
 */

let _config = null

export function configureBitbucket({ baseUrl, username, token, projectKey }) {
  _config = {
    baseUrl: baseUrl.replace(/\/$/, ''),
    auth: btoa(`${username}:${token}`),
    projectKey,
  }
}

export function isBitbucketConfigured() {
  return !!_config
}

function headers() {
  if (!_config) throw new Error('請先設定 Bitbucket 連線資訊')
  return {
    Authorization: `Basic ${_config.auth}`,
    'Content-Type': 'application/json',
    'X-Proxy-Target': _config.baseUrl,
  }
}

async function get(path, params = {}) {
  const url = new URL(`/api-proxy/rest/api/1.0${path}`, window.location.origin)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  const res = await fetch(url.toString(), { headers: headers() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Bitbucket API 錯誤 [${res.status}]: ${text}`)
  }
  return res.json()
}

/** 依 Jira Key 搜尋關聯 PR（filterText 比對 title / branch） */
export async function searchPRsByJiraKey(repoSlug, jiraKey) {
  try {
    const data = await get(
      `/projects/${_config.projectKey}/repos/${repoSlug}/pull-requests`,
      { filterText: jiraKey, state: 'MERGED', limit: 50 }
    )
    return data.values ?? []
  } catch {
    return []
  }
}

/** 取得 PR 評論數（計算 activity 中 action=COMMENTED 的筆數） */
export async function getPRCommentCount(repoSlug, prId) {
  try {
    let count = 0, start = 0
    while (true) {
      const data = await get(
        `/projects/${_config.projectKey}/repos/${repoSlug}/pull-requests/${prId}/activities`,
        { start, limit: 100 }
      )
      count += (data.values ?? []).filter((a) => a.action === 'COMMENTED').length
      if (data.isLastPage) break
      start = data.nextPageStart
    }
    return count
  } catch {
    return 0
  }
}

/** 取得 PR 程式碼變動量（新增行 + 刪除行） */
export async function getPRDiffStat(repoSlug, prId) {
  try {
    let added = 0, removed = 0, start = 0
    while (true) {
      const data = await get(
        `/projects/${_config.projectKey}/repos/${repoSlug}/pull-requests/${prId}/changes`,
        { start, limit: 500 }
      )
      for (const c of data.values ?? []) {
        added   += c.linesAdded   ?? 0
        removed += c.linesRemoved ?? 0
      }
      if (data.isLastPage) break
      start = data.nextPageStart
    }
    return { added, removed, total: added + removed }
  } catch {
    return { added: 0, removed: 0, total: 0 }
  }
}
