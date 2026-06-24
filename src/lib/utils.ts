// 台灣時區（UTC+8）日期工具。Vercel 跑在 UTC，一律手動補 8 小時。

const TW_OFFSET_MS = 8 * 60 * 60 * 1000

function twNow(): Date {
  return new Date(Date.now() + TW_OFFSET_MS)
}

function ymd(d: Date): string {
  // d 已是「加好 8 小時的時間」，用 UTC 取值避免再被本機時區位移
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getTodayDate(): string {
  return ymd(twNow())
}

// 本週範圍（週一～週日，台灣時間），回傳 YYYY-MM-DD 字串。
export function getCurrentWeekRange(): { start: string; end: string } {
  const now = twNow()
  const dow = now.getUTCDay() // 0=日,1=一,...,6=六
  const mondayOffset = dow === 0 ? -6 : 1 - dow // 把週日視為上一個週一+6
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return { start: ymd(monday), end: ymd(sunday) }
}
