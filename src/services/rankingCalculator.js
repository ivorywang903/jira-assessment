/**
 * 綜合排名演算法
 *
 * 產出 40%  = 完單數（20%）+ 代碼變動量（20%）
 * 效率 30%  = 平均開發工作天（排除非人為延遲單）
 * 品質 30%  = PR 評論密度（越低越好）
 */

const WEIGHTS = { output: 0.4, efficiency: 0.3, quality: 0.3 }

/**
 * 正規化：將陣列中的值線性縮放至 0~100
 */
function normalize(values, higherIsBetter = true) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return values.map(() => 100)
  return values.map((v) => {
    const ratio = (v - min) / (max - min)
    return higherIsBetter ? ratio * 100 : (1 - ratio) * 100
  })
}

/**
 * 計算每位成員的分數與排名
 * @param {Array<MemberStats>} members
 * @returns {Array<RankedMember>}
 *
 * MemberStats: {
 *   enName, displayName,
 *   totalTickets,          // 完單數
 *   totalCodeChanges,      // 新增+刪除行數
 *   avgLeadTime,           // 含異常單的平均工作天
 *   adjustedLeadTime,      // 排除非人為異常單後的平均工作天
 *   totalPrComments,       // 總 PR 評論數
 *   totalPrs,              // PR 數
 *   delayedTickets,        // 超過10工作天的單子陣列
 * }
 */
export function calcRanking(members) {
  if (!members.length) return []

  const ticketCounts   = members.map((m) => m.totalTickets)
  const codeChanges    = members.map((m) => m.totalCodeChanges)
  const leadTimes      = members.map((m) => m.adjustedLeadTime ?? m.avgLeadTime ?? 0)
  const commentDensity = members.map((m) =>
    m.totalPrs > 0 ? m.totalPrComments / m.totalPrs : 0
  )

  const normTickets   = normalize(ticketCounts, true)
  const normCode      = normalize(codeChanges, true)
  const normLead      = normalize(leadTimes, false)  // 天數越少越好
  const normDensity   = normalize(commentDensity, false)  // 評論密度越低越好

  return members
    .map((m, i) => {
      const outputScore     = (normTickets[i] * 0.5 + normCode[i] * 0.5)
      const efficiencyScore = normLead[i]
      const qualityScore    = normDensity[i]
      const finalScore      =
        outputScore * WEIGHTS.output +
        efficiencyScore * WEIGHTS.efficiency +
        qualityScore * WEIGHTS.quality

      return {
        ...m,
        outputScore:     round(outputScore),
        efficiencyScore: round(efficiencyScore),
        qualityScore:    round(qualityScore),
        finalScore:      round(finalScore),
        prCommentDensity: m.totalPrs > 0 ? round(m.totalPrComments / m.totalPrs, 1) : 0,
      }
    })
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((m, i) => ({ ...m, rank: i + 1 }))
}

/**
 * 計算單一成員的 adjustedLeadTime（排除非人為延遲異常單）
 * @param {Array<{leadTime: number, isNonHuman: boolean}>} tickets
 * @returns {number}
 */
export function calcAdjustedLeadTime(tickets) {
  const validTickets = tickets.filter(
    (t) => !t.isDelayed || (t.isDelayed && !t.isNonHuman)
  )
  if (!validTickets.length) return 0
  const sum = validTickets.reduce((acc, t) => acc + (t.leadTime ?? 0), 0)
  return round(sum / validTickets.length, 2)
}

function round(val, decimals = 2) {
  return Math.round(val * 10 ** decimals) / 10 ** decimals
}

export const DELAY_THRESHOLD = 10  // 工作天
