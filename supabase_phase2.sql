-- ============================================================
-- 802BP phase 2：多帳號 + 角色權限（RBAC）
-- 後台從「單一密碼」升級成「帳號表 + 角色」。
-- admin（超級管理者）全權；vendor（廠商）綁 contractor，只看自己。
-- 在 Supabase SQL Editor 貼上整段執行。
-- ============================================================

create table if not exists public.app_users (
  id            uuid primary key default gen_random_uuid(),
  account       text not null unique,            -- 登入帳號
  password_hash text not null,                   -- bcrypt（cost 10）
  display_name  text not null,                   -- 顯示名稱
  role          text not null default 'vendor',  -- 'superadmin' | 'vendor'
  contractor    text,                            -- vendor 綁定廠商（基誠/偉翔）；superadmin 為 null
  active        boolean not null default true,   -- 停用＝不能登入
  created_at    timestamptz not null default now()
);

create index if not exists idx_app_users_account on public.app_users (account);

-- 開 RLS 但「不建任何 anon/authenticated policy」→ 只有後台 service_role 能存取。
-- 廠商、匿名（廠商表單）完全碰不到帳號表。
alter table public.app_users enable row level security;

-- ------------------------------------------------------------
-- Seed 超級管理者（帳號 admin / 密碼 admin）。
-- ⚠️ 上線後請立刻到後台「帳號管理」改密碼。
-- 下面的 hash 是 bcrypt('admin', 10)；要換密碼可在後台改，或重產 hash 後 update。
-- ------------------------------------------------------------
insert into public.app_users (account, password_hash, display_name, role, contractor)
values (
  'admin',
  '$2b$10$cMVQ3prKMOW5vPoE/bOkGukGVdQyI83O3orpUEU6OfvrIfvCnNixi',
  '管理者',
  'superadmin',
  null
)
on conflict (account) do nothing;

-- ------------------------------------------------------------
-- 廠商帳號之後到後台「帳號管理」頁新增即可（會自動 bcrypt 並綁 contractor）。
-- 若想先用 SQL 建，範本如下（password_hash 需自行用 bcrypt 產）：
-- insert into public.app_users (account, password_hash, display_name, role, contractor)
-- values ('weixiang', '<bcrypt-hash>', '偉翔', 'vendor', '偉翔');
-- ------------------------------------------------------------
