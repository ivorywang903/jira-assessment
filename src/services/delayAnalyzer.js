/**
 * 異常單分析 — 延遲原因關鍵字比對
 * 使用正則表達式高效過濾 Comment 中的延遲關鍵字
 */

// 延遲原因關鍵字分類（非人為因素 → 降低效率負評）
const DELAY_PATTERNS = {
  environment: /(?:等待|waiting|wait).{0,10}(?:環境|env|server|伺服器|部署|deploy)/i,
  specChange:  /(?:規格|spec|需求|requirement).{0,10}(?:變更|更改|修改|change|update|調整)/i,
  external:    /(?:第三方|external|外部|廠商|vendor|client|客戶).{0,20}(?:回覆|確認|提供|delay|延遲)/i,
  blocked:     /(?:blocked|阻塞|卡住|waiting for|等待).{0,30}(?:approval|批准|確認|confirm)/i,
  infra:       /(?:infrastructure|infra|網路|network|DB|database|資料庫).{0,20}(?:問題|issue|error|錯誤|異常)/i,
  holiday:     /(?:假期|holiday|請假|休假|補班)/i,
  meeting:     /(?:會議|meeting|討論|review).{0,20}(?:延遲|delay|佔用|時間)/i,
}

/**
 * 分析 comments 是否包含非人為延遲原因
 * @param {Array<{body: string}>} comments
 * @returns {{ isNonHuman: boolean, reasons: string[], summary: string }}
 */
export function analyzeDelayReasons(comments) {
  const matchedReasons = []
  const matchedTexts = []

  for (const comment of comments) {
    const body = comment.body ?? comment.renderedBody ?? ''
    for (const [category, regex] of Object.entries(DELAY_PATTERNS)) {
      if (regex.test(body)) {
        if (!matchedReasons.includes(category)) {
          matchedReasons.push(category)
          const match = body.match(regex)
          if (match) {
            const start = Math.max(0, match.index - 20)
            const end = Math.min(body.length, match.index + match[0].length + 40)
            matchedTexts.push(`[${categoryLabel(category)}] ...${body.slice(start, end)}...`)
          }
        }
      }
    }
  }

  return {
    isNonHuman: matchedReasons.length > 0,
    reasons: matchedReasons,
    summary: matchedTexts.slice(0, 3).join('\n') || '無說明',
  }
}

function categoryLabel(key) {
  const map = {
    environment: '環境等待',
    specChange:  '規格變更',
    external:    '外部依賴',
    blocked:     '等待確認',
    infra:       '基礎設施',
    holiday:     '假期',
    meeting:     '會議佔用',
  }
  return map[key] ?? key
}

export { categoryLabel }
