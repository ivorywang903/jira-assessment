/**
 * 台灣工作日計算
 * 假日資料來源：https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/${year}.json
 */

const calendarCache = {}

async function fetchTaiwanCalendar(year) {
  if (calendarCache[year]) return calendarCache[year]
  const url = `https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/${year}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`無法取得 ${year} 年曆資料`)
  const data = await res.json()
  // 建立 Set：非工作日的日期字串 (YYYY-MM-DD)
  const holidays = new Set(
    data
      .filter((d) => d.isHoliday)
      .map((d) => d.date)
  )
  calendarCache[year] = holidays
  return holidays
}

/**
 * 計算兩個日期之間的台灣工作天數（不含起始日，含結束日）
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @returns {Promise<number>}
 */
export async function calcWorkdays(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (end <= start) return 0

  // 收集需要的年份
  const years = new Set()
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) years.add(y)

  // 預先載入所有年份的假日資料
  const holidaySets = await Promise.all([...years].map(fetchTaiwanCalendar))
  const allHolidays = new Set(holidaySets.flatMap((s) => [...s]))

  let count = 0
  const cur = new Date(start)
  cur.setDate(cur.getDate() + 1) // 不含起始日

  while (cur <= end) {
    const dateStr = toDateStr(cur)
    const dow = cur.getDay()
    const isWeekend = dow === 0 || dow === 6
    if (!isWeekend && !allHolidays.has(dateStr)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

/**
 * 預載入指定年份的假日資料（Dashboard 初始化時呼叫）
 */
export async function preloadCalendar(year) {
  return fetchTaiwanCalendar(year)
}

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
