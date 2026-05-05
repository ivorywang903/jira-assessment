/**
 * Jira API 整合服務
 * 所有請求透過 Vite dev server 的 /api-proxy 轉發，解決地端 CORS 問題。
 */

let _config = null

export function configureJira({ baseUrl, username, token }) {
  _config = {
    baseUrl: baseUrl.replace(/\/$/, ''),
    auth: btoa(`${username}:${token}`),
  }
}

function headers() {
  if (!_config) throw new Error('請先設定 Jira 連線資訊')
  return {
    Authorization: `Basic ${_config.auth}`,
    'Content-Type': 'application/json',
    'X-Proxy-Target': _config.baseUrl,
  }
}

async function get(path, params = {}) {
  const url = new URL(`/api-proxy/rest/api/2${path}`, window.location.origin)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  const res = await fetch(url.toString(), { headers: headers() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Jira API 錯誤 [${res.status}]: ${text}`)
  }
  return res.json()
}

/** 以 JQL 搜尋票據（自動分頁，每頁 100 筆） */
export async function searchIssues({ jql, maxResults = 500 }) {
  const fields = ['summary', 'assignee', 'status', 'customfield_10502', 'customfield_12000']
  let startAt = 0
  const all = []

  while (true) {
    const data = await get('/search', {
      jql,
      startAt,
      maxResults: Math.min(maxResults - all.length, 100),
      fields: fields.join(','),
      expand: 'changelog',
    })
    all.push(...data.issues)
    if (all.length >= data.total || all.length >= maxResults) break
    startAt += data.issues.length
  }
  return all
}

/** 取得單一票據的完整 Changelog */
export async function getIssueChangelog(issueKey) {
  let startAt = 0
  const all = []
  while (true) {
    const data = await get(`/issue/${issueKey}/changelog`, { startAt, maxResults: 100 })
    all.push(...data.values)
    if (all.length >= data.total) break
    startAt += data.values.length
  }
  return all
}

/** 取得票據留言 */
export async function getIssueComments(issueKey) {
  const data = await get(`/issue/${issueKey}/comment`, { maxResults: 100 })
  return data.comments ?? []
}

/**
 * 從 Changelog 找出 Implement 進入時間與 RD TEST 進入時間
 * - implementDate：第一次進入 Implement 的時間
 * - rdTestDate：從 Implement 離開後進入 RD TEST 的時間（或任意進入 RD TEST）
 */
export function extractStatusTransitions(changelog, fromStatus = 'Implement', toStatus = 'RD TEST') {
  let implementDate = null
  let rdTestDate = null

  for (const entry of changelog) {
    const change = entry.items?.find((i) => i.field === 'status')
    if (!change) continue

    const to   = (change.toString   ?? '').toLowerCase()
    const from = (change.fromString ?? '').toLowerCase()

    if (to === fromStatus.toLowerCase() && !implementDate) {
      implementDate = entry.created
    }
    if (to === toStatus.toLowerCase() && from === fromStatus.toLowerCase()) {
      rdTestDate = entry.created
    }
  }

  // fallback：RD TEST 可能從非 Implement 狀態進入
  if (!rdTestDate) {
    for (const entry of changelog) {
      const change = entry.items?.find((i) => i.field === 'status')
      if (!change) continue
      if ((change.toString ?? '').toLowerCase() === toStatus.toLowerCase()) {
        rdTestDate = entry.created
        break
      }
    }
  }

  return { implementDate, rdTestDate }
}

/** 建立 JQL 查詢語句 */
export function buildJQL({ names, startDate, endDate }) {
  const nameList = names.map((n) => `"${n}"`).join(', ')
  return (
    `project not in (PM, TSE) AND type != Epic AND ` +
    `(assignee in (${nameList}) OR "Implement Host" in (${nameList})) AND ` +
    `Status in (DONE, "QA Test") AND ` +
    `"End date" >= "${startDate}" AND "End date" <= "${endDate}" ` +
    `ORDER BY cf[12000] DESC, updated ASC, cf[10502] ASC, key ASC`
  )
}
