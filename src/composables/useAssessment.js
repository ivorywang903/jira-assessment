import { ref } from 'vue'
import { searchIssues, getIssueChangelog, getIssueComments, extractStatusTransitions, buildJQL } from '@/services/jiraApi'
import { searchPRsByJiraKey, getPRCommentCount, getPRDiffStat } from '@/services/bitbucketApi'
import { calcWorkdays, preloadCalendar } from '@/services/workday'
import { analyzeDelayReasons } from '@/services/delayAnalyzer'
import { calcRanking, calcAdjustedLeadTime, DELAY_THRESHOLD } from '@/services/rankingCalculator'
import { saveAssessmentRecord, getAssessmentRecords } from '@/services/supabase'

export function useAssessment() {
  const loading    = ref(false)
  const progress   = ref({ current: 0, total: 0, message: '' })
  const results    = ref([])
  const allTickets = ref([])
  const errors     = ref([])
  const isCached   = ref(false)

  /**
   * 主入口：自動判斷快取，有快取就直接載入
   * @param {{ members, startDate, endDate, repoSlugs, period, forceRefresh }}
   */
  async function runAssessment({ members, startDate, endDate, repoSlugs = [], period, forceRefresh = false }) {
    errors.value = []
    results.value = []
    allTickets.value = []
    isCached.value = false

    if (!forceRefresh) {
      const cached = await tryLoadCache(members, startDate, endDate)
      if (cached) {
        results.value = cached
        isCached.value = true
        return
      }
    }

    await fetchFromApi({ members, startDate, endDate, repoSlugs, period })
  }

  /** 嘗試從 DB 載入快取，全員都有才視為命中 */
  async function tryLoadCache(members, startDate, endDate) {
    const enNames = members.map((m) => m.enName)
    const records = await getAssessmentRecords(startDate, endDate, enNames)
    if (records.length < enNames.length) return null
    return recordsToResults(records, members)
  }

  /** 從 Jira / Bitbucket 重新抓取並存入 DB */
  async function fetchFromApi({ members, startDate, endDate, repoSlugs, period }) {
    loading.value = true
    progress.value = { current: 0, total: 0, message: '初始化...' }

    try {
      const year = new Date(startDate).getFullYear()
      await preloadCalendar(year)
      if (new Date(endDate).getFullYear() !== year) {
        await preloadCalendar(new Date(endDate).getFullYear())
      }

      progress.value.message = '正在查詢 Jira 票據...'
      const jql = buildJQL({ names: members.map((m) => m.enName), startDate, endDate })
      const issues = await searchIssues({ jql })
      progress.value.total = issues.length
      progress.value.message = `共找到 ${issues.length} 張票據，開始分析...`

      const ticketDetails = []
      for (const issue of issues) {
        progress.value.current++
        progress.value.message = `分析 ${issue.key} (${progress.value.current}/${progress.value.total})`
        try {
          ticketDetails.push(await analyzeTicket(issue, repoSlugs))
        } catch (e) {
          errors.value.push(`${issue.key}: ${e.message}`)
        }
      }

      allTickets.value = ticketDetails

      const memberMap = {}
      for (const m of members) memberMap[m.enName] = { ...m, tickets: [] }
      for (const t of ticketDetails) {
        if (memberMap[t.assignee]) memberMap[t.assignee].tickets.push(t)
      }

      const memberStats = Object.values(memberMap).map(buildMemberStats)
      const ranked = calcRanking(memberStats)
      results.value = ranked
      isCached.value = false

      // 存入 DB（有 period 且 Supabase 已設定時）
      if (period) {
        await Promise.allSettled(
          ranked.map((m) =>
            saveAssessmentRecord({
              en_name:             m.enName,
              period,
              start_date:          startDate,
              end_date:            endDate,
              total_tickets:       m.totalTickets,
              avg_lead_time:       m.adjustedLeadTime,
              total_code_changes:  m.totalCodeChanges,
              total_pr_comments:   m.totalPrComments,
              pr_quality_metrics:  {
                density:        m.prCommentDensity,
                totalPrs:       m.totalPrs,
                rawAvgLeadTime: m.avgLeadTime,
              },
              delayed_tickets_json: m.delayedTickets,
              output_score:    m.outputScore,
              efficiency_score: m.efficiencyScore,
              quality_score:   m.qualityScore,
              final_score:     m.finalScore,
              rank:            m.rank,
            })
          )
        )
      }

      progress.value.message = '分析完成！'
    } catch (e) {
      errors.value.push(`系統錯誤：${e.message}`)
    } finally {
      loading.value = false
    }
  }

  async function analyzeTicket(issue, repoSlugs) {
    const key      = issue.key
    const assignee = issue.fields?.assignee?.name ?? issue.fields?.assignee?.displayName ?? 'Unknown'

    let changelog = issue.changelog?.histories ?? []
    if (!changelog.length) changelog = await getIssueChangelog(key)

    const { implementDate, rdTestDate } = extractStatusTransitions(changelog)
    let leadTime = null
    if (implementDate && rdTestDate) leadTime = await calcWorkdays(implementDate, rdTestDate)

    const isDelayed = leadTime !== null && leadTime > DELAY_THRESHOLD

    let delayAnalysis = { isNonHuman: false, reasons: [], summary: '' }
    if (isDelayed) {
      const comments = await getIssueComments(key)
      delayAnalysis = analyzeDelayReasons(comments)
    }

    let prComments = 0, codeChanges = 0
    if (repoSlugs.length > 0) {
      for (const slug of repoSlugs) {
        const prs = await searchPRsByJiraKey(slug, key)
        for (const pr of prs) {
          prComments  += await getPRCommentCount(slug, pr.id)
          codeChanges += (await getPRDiffStat(slug, pr.id)).total
        }
      }
    }

    return {
      key, summary: issue.fields?.summary ?? '', assignee,
      implementDate, rdTestDate, leadTime, isDelayed,
      isNonHuman: delayAnalysis.isNonHuman,
      delayReasons: delayAnalysis.reasons,
      delaySummary: delayAnalysis.summary,
      prComments, codeChanges,
    }
  }

  function buildMemberStats(member) {
    const { tickets } = member
    const totalTickets      = tickets.length
    const totalCodeChanges  = tickets.reduce((s, t) => s + t.codeChanges, 0)
    const totalPrComments   = tickets.reduce((s, t) => s + t.prComments, 0)
    const totalPrs          = tickets.filter((t) => t.prComments > 0).length
    const withLeadTime      = tickets.filter((t) => t.leadTime !== null)
    const avgLeadTime       = withLeadTime.length
      ? round(withLeadTime.reduce((s, t) => s + t.leadTime, 0) / withLeadTime.length)
      : 0
    const adjustedLeadTime  = calcAdjustedLeadTime(withLeadTime)
    const delayedTickets    = tickets.filter((t) => t.isDelayed)

    return {
      enName: member.enName, displayName: member.displayName ?? member.enName,
      totalTickets, totalCodeChanges, totalPrComments, totalPrs,
      avgLeadTime, adjustedLeadTime, delayedTickets,
    }
  }

  /** 將 DB 記錄轉換回排名顯示格式 */
  function recordsToResults(records, members) {
    const memberMap = Object.fromEntries(members.map((m) => [m.enName, m]))
    return records
      .map((r) => ({
        enName:           r.en_name,
        displayName:      memberMap[r.en_name]?.displayName ?? r.en_name,
        totalTickets:     r.total_tickets,
        avgLeadTime:      r.pr_quality_metrics?.rawAvgLeadTime ?? r.avg_lead_time,
        adjustedLeadTime: r.avg_lead_time,
        totalCodeChanges: r.total_code_changes,
        totalPrComments:  r.total_pr_comments,
        totalPrs:         r.pr_quality_metrics?.totalPrs ?? 0,
        prCommentDensity: r.pr_quality_metrics?.density  ?? 0,
        delayedTickets:   r.delayed_tickets_json ?? [],
        outputScore:      r.output_score,
        efficiencyScore:  r.efficiency_score,
        qualityScore:     r.quality_score,
        finalScore:       r.final_score,
        rank:             r.rank,
      }))
      .sort((a, b) => a.rank - b.rank)
  }

  function round(v, d = 2) {
    return Math.round(v * 10 ** d) / 10 ** d
  }

  return { loading, progress, results, allTickets, errors, isCached, runAssessment }
}
