// 照片下載檔名：優先用表單存的工作檔名（photo_*_name），否則用孔號組。
type Rec = {
  hole_short: string | null
  serial: string | null
  photo_done_name: string | null
  photo_far_name: string | null
  photo_near_name: string | null
}
export type PhotoKind = 'done' | 'far' | 'near'

export function photoFileName(rec: Rec, kind: PhotoKind): string {
  const stored =
    kind === 'done' ? rec.photo_done_name : kind === 'far' ? rec.photo_far_name : rec.photo_near_name
  if (stored && stored.trim()) {
    return stored.toLowerCase().endsWith('.jpg') ? stored : `${stored}.jpg`
  }
  const label = kind === 'done' ? '完工' : kind === 'far' ? '遠' : '近'
  const base = rec.hole_short || rec.serial || 'photo'
  return `${base}_${label}.jpg`
}

export function photoPath(rec: Record<string, unknown>, kind: PhotoKind): string | null {
  return (rec[`photo_${kind}_path`] as string) || null
}
