-- ============================================================
-- 802BP phase 1：狀態預設 + 寄件設定表
-- 定位修正：本系統＝收件/紀錄/寄件，無配號、無計價。
-- ============================================================

-- 狀態簡化為 待寄 / 已寄（0 列資料，直接改預設）
alter table public.hole_uploads alter column status set default '待寄';

-- 收件人清單（公司 + 各廠商），後台頁面增刪
create table if not exists public.report_emails (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  label      text,                              -- 顯示名稱：公司 / 基誠 / 偉翔
  kind       text not null default 'company',   -- company | contractor
  created_at timestamptz not null default now()
);
alter table public.report_emails enable row level security;
-- 故意不建 anon policy → 只有後台 service_role 可存取（廠商/匿名碰不到）

-- 寄送設定（單列）
create table if not exists public.report_config (
  id         int primary key default 1,
  enabled    boolean not null default false,    -- 自動寄送總開關
  send_dow   int,                               -- 0=日…6=六，寄送星期（選填）
  mail_from  text,                              -- Resend 已驗證寄件地址
  updated_at timestamptz not null default now()
);
alter table public.report_config enable row level security;
insert into public.report_config (id, enabled) values (1, false) on conflict (id) do nothing;
