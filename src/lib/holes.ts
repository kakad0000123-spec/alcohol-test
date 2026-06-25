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
