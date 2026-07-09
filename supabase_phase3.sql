-- Phase 3：扁鐵補修欄位（2026-07-09）
-- 補孔周邊需配合修補的扁鐵 FB25×4.5，記錄「長度」；重量由長度即時換算、不入庫。
-- 加欄可為 NULL、無預設 → 不動任何舊資料、純 metadata 操作、不鎖表；idempotent 可重跑。
alter table public.hole_uploads
  add column if not exists flatbar_raw text,     -- 廠商填的算式（正規化後）例：8*2+9+20*2
  add column if not exists flatbar_mm  numeric;  -- 解析後長度 mm（前後台同一支 parseFlatbar 算出）
