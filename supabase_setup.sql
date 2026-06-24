-- ============================================================
-- 802BP 補強照片上傳表 — Supabase 一次設定
-- 在 Supabase 後台 → SQL Editor 貼上整段執行即可
-- ============================================================

-- 1) 資料表 -------------------------------------------------
create table if not exists public.hole_uploads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),   -- 上傳時間（系統自動，廠商不填）

  -- 廠商填寫
  work_date     date    not null,                     -- 施工日期
  contractor    text    not null,                     -- 基誠 / 偉翔
  knows_hole    boolean not null,                     -- true=知道孔號 false=不知道

  -- 知道孔號
  serial        text,                                 -- 孔號末三碼（流水號，例 001）
  hole_short    text,                                 -- 完整孔號（系統自動組：區域+格線+末三碼）

  -- 不知道孔號
  area          text,                                 -- 樓層／區域
  grid_x        text,                                 -- X 向格線
  grid_y        text,                                 -- Y 向格線
  location_note text,                                 -- 位置補充說明

  -- 開孔尺寸（計價用，廠商填形狀＋數字，周長由前端自動算）
  shape         text,                                 -- 圓 / 矩
  dia_mm        numeric,                              -- 圓孔直徑
  width_mm      numeric,                              -- 矩形寬
  height_mm     numeric,                              -- 矩形高
  perimeter_mm  numeric,                              -- 周長（計價基礎）：圓 πD、矩 2(W+H)
  size_label    text,                                 -- 顯示用：Ø300 / 300×400
  size_note     text,                                 -- 備註（選填）

  -- 照片（Storage 路徑 + 工作檔名）
  photo_done_path text, photo_done_name text,         -- 完工照（知道孔號）
  photo_far_path  text, photo_far_name  text,         -- 遠照（不知道孔號）
  photo_near_path text, photo_near_name text,         -- 近照（不知道孔號）

  -- 後台流程（廠商不填，由你/後台維護）
  status      text not null default '待核',           -- 待核 / 已配號 / 已歸檔 / 已寄出
  hole_id     text,                                   -- 正式孔號 OP-...
  tmp_id      text,                                   -- 後台產生的 TMP（如需）
  sent_at     timestamptz,                            -- 後台寄出時間（緩衝刪除以此計算）
  archived_at timestamptz                             -- 歸檔到公司端的時間
);

create index if not exists idx_hole_uploads_date   on public.hole_uploads (work_date);
create index if not exists idx_hole_uploads_status on public.hole_uploads (status);
create index if not exists idx_hole_uploads_sent   on public.hole_uploads (sent_at);

-- 1b) 若你先前已建過舊版表，補上尺寸/周長欄位（新建可略過此段）
alter table public.hole_uploads
  add column if not exists serial       text,
  add column if not exists shape        text,
  add column if not exists dia_mm       numeric,
  add column if not exists width_mm     numeric,
  add column if not exists height_mm    numeric,
  add column if not exists perimeter_mm numeric,
  add column if not exists size_label   text;

-- 2) 開啟 RLS，只允許「匿名新增」，不允許匿名讀取 ----------
alter table public.hole_uploads enable row level security;

drop policy if exists "anon insert" on public.hole_uploads;
create policy "anon insert"
  on public.hole_uploads for insert
  to anon
  with check (true);
-- 故意不建立 anon 的 select 政策 → 廠商彼此看不到資料。
-- 後台用 service_role 金鑰存取，略過 RLS，可讀全部。

-- 3) Storage 桶（私有）------------------------------------
insert into storage.buckets (id, name, public)
values ('hole-photos', 'hole-photos', false)
on conflict (id) do nothing;

drop policy if exists "anon upload hole photos" on storage.objects;
create policy "anon upload hole photos"
  on storage.objects for insert
  to anon
  with check ( bucket_id = 'hole-photos' );
-- 同樣不給 anon 讀取；照片只供後台用 service_role 下載。

-- ============================================================
-- 4)（選用）計價：每孔周長換算與小計（後台檢視用）
--    周長已存 perimeter_mm；計價時換成公尺再乘單價。
--    例：每 m 單價放入 :unit_price。
-- ============================================================
-- select work_date, contractor, coalesce(hole_id, tmp_id) as hole,
--        shape, size_label, perimeter_mm,
--        round(perimeter_mm/1000.0, 2)            as perimeter_m,
--        round(perimeter_mm/1000.0 * :unit_price) as amount
-- from public.hole_uploads
-- order by work_date, contractor;

-- ============================================================
-- 5)（選用）兩週緩衝刪除 — 找出「已寄出且超過 14 天」的照片
--    寄回公司並標 status='已寄出'、填 sent_at 後，再保留 14 天，
--    之後才刪 Storage。實際刪檔由後台（Mac mini 排程 / Streamlit）
--    呼叫 Storage API 執行，刪完把對應 path 欄位設為 NULL。
-- ============================================================
-- 查可刪清單：
--   select id, photo_done_path, photo_far_path, photo_near_path, sent_at
--   from public.hole_uploads
--   where sent_at is not null
--     and sent_at < now() - interval '14 days'
--     and (photo_done_path is not null or photo_far_path is not null or photo_near_path is not null);
--
-- 刪完 Storage 後標記已清除：
--   update public.hole_uploads
--   set photo_done_path=null, photo_far_path=null, photo_near_path=null
--   where id = '<該筆 id>';
