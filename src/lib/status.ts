// 紀錄狀態：未請款 / 已請款。
//
// 2026-08-03 由「待寄／已寄」改名而來。原本追的是「有沒有寄回公司」，但那個維度上線四個多月
// 從沒被用過（130 筆全是待寄、0 筆有 sent_at），Po 實際在追的是請款進度 → 改成對齊現實的用詞。
// 「已請款」由 Po（superadmin）判定並手動標記，廠商不可改狀態。

export const STATUS_UNBILLED = '未請款'
export const STATUS_BILLED = '已請款'

// 舊值容錯：資料遷移與部署之間有時間差，且日後若 git 回退舊版也不會炸。
// 遷移完成、確認線上無殘留舊值後可以拿掉這兩個 legacy 分支。
const LEGACY_BILLED = '已寄'
const LEGACY_UNBILLED = '待寄'

// 判斷是否已請款。非「已請款」一律視為未請款（fail-safe：狀態不明時不會誤判成已請款，
// 因為已請款會解鎖「廠商不可刪」與「14 天後自動刪照片」兩個不可逆行為）。
export function isBilled(status: string | null | undefined): boolean {
  return status === STATUS_BILLED || status === LEGACY_BILLED
}

// 查詢用：把一個狀態展開成「新值 + 舊值」，供 .in() 篩選，避免遷移期間篩不到舊資料。
export function statusFilterValues(status: string): string[] {
  if (status === STATUS_BILLED) return [STATUS_BILLED, LEGACY_BILLED]
  if (status === STATUS_UNBILLED) return [STATUS_UNBILLED, LEGACY_UNBILLED]
  return [status]
}
