// 衍生欄位重算邏輯 —— 原樣移植自 public/upload.html（廠商表單前端）。
// 後台編輯欄位時要用同一套規則重算 hole_short / perimeter_mm / size_label，
// 否則改了尺寸/格線、衍生欄位沒跟著重算就會髒掉。
// （upload.html 是純 JS 不 import TS，故各留一份；改動規則時兩邊都要同步。）

// 末三碼：純數字補零到 3 碼，否則原樣
export function serial3(v: string | null | undefined): string | null {
  const s = (v ?? '').trim()
  if (!s) return null
  return /^\d+$/.test(s) ? s.padStart(3, '0') : s
}

// 區域 → 孔號前綴：「3200區1.5F EL03500」→「3200-3500」；無法解析則原樣回傳
export function holePrefix(area: string): string {
  const m = area.match(/^(\d+)區.*EL0*(\d+)$/)
  return m ? `${m[1]}-${m[2]}` : area
}

// 完整孔號：前綴-XY-末三碼；四者齊全才組得出來
export function fullHoleCode(
  area: string | null | undefined,
  x: string | null | undefined,
  y: string | null | undefined,
  serial: string | null | undefined,
): string | null {
  const s = serial3(serial)
  if (area && x && y && s) return `${holePrefix(area)}-${x}${y}-${s}`
  return null
}

export type PerimResult = { perimeter_mm: number; size_label: string }

// 周長 + 顯示尺寸：圓 πD（label Ø{d}）；矩 2(W+H)（label {w}×{h}）。皆四捨五入到 0.1mm。
export function computePerim(
  shape: string | null | undefined,
  dia: number | null | undefined,
  w: number | null | undefined,
  h: number | null | undefined,
): PerimResult | null {
  if (shape === '圓' && dia && dia > 0) {
    return { perimeter_mm: Math.round(Math.PI * dia * 10) / 10, size_label: 'Ø' + dia }
  }
  if (shape === '矩' && w && w > 0 && h && h > 0) {
    return { perimeter_mm: Math.round(2 * (w + h) * 10) / 10, size_label: `${w}×${h}` }
  }
  return null
}

// ── 扁鐵補修（FB25×4.5）──────────────────────────────────────────
// 補孔周邊需配合修補的扁鐵，一孔可穿過多支隔柵、各補一段，故長度＝多段相加。
// 重量由長度即時換算、不入庫（純長度×固定斷面，避免與長度不同步）。
export const FLATBAR_SPEC = 'FB25*4.5'
// 鋼材單位重 kg/m = 寬 × 厚 × 0.00785 = 25 × 4.5 × 0.00785 = 0.883125 kg/m；
// kg/m 與 g/mm 數值相等，故 g/mm = 0.883125。
export const FLATBAR_G_PER_MM = 25 * 4.5 * 0.00785

// 長度(mm) → 重量(g)，四捨五入到整數 g；無長度回 null
export function flatbarWeightG(mm: number | null | undefined): number | null {
  if (mm == null || !(mm > 0)) return null
  return Math.round(mm * FLATBAR_G_PER_MM)
}

// 扁鐵算式解析結果：empty＝沒填（合法）／invalid＝格式錯／ok＝解析成功
export type FlatbarParse =
  | { state: 'empty' }
  | { state: 'invalid' }
  | { state: 'ok'; mm: number; normalized: string }

// 扁鐵算式 → 長度 mm。只認 數字/＋/＊（× 視為 *，全形轉半形），逐段「長×支」相乘再相加。
// 存入 flatbar_raw 的是正規化後字串（可再解析），flatbar_mm 是本函式算出的長度。
export function parseFlatbar(raw: string | null | undefined): FlatbarParse {
  const s0 = (raw ?? '').trim()
  if (!s0) return { state: 'empty' }
  const s = s0
    .replace(/[×✕✖＊]/g, '*')
    .replace(/＋/g, '+')
    .replace(/[０-９]/g, d => String('０１２３４５６７８９'.indexOf(d)))
    .replace(/\s+/g, '')
  if (!/^[0-9.+*]+$/.test(s)) return { state: 'invalid' }
  let total = 0
  for (const term of s.split('+')) {
    if (term === '') return { state: 'invalid' } // 8++9 / 結尾 +
    let prod = 1
    for (const factor of term.split('*')) {
      if (factor === '') return { state: 'invalid' } // 8**2 / 結尾 *
      const n = Number(factor)
      if (!Number.isFinite(n)) return { state: 'invalid' }
      prod *= n
    }
    total += prod
  }
  if (!(total > 0)) return { state: 'invalid' }
  return { state: 'ok', mm: Math.round(total * 10) / 10, normalized: s }
}
