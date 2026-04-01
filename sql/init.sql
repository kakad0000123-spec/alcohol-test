-- ============================================================
-- 廠商酒測回報系統 - 資料庫初始化 SQL
-- 請在 Supabase Dashboard > SQL Editor 執行此腳本
-- ============================================================

-- ============================================================
-- accounts 表（後台使用者）
-- ============================================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'user', 'vendor')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- vendors 表（廠商）
-- ============================================================
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT,
  account TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- records 表（酒測紀錄）
-- ============================================================
CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  session TEXT NOT NULL CHECK (session IN ('AM', 'PM', 'Night')),
  file_hash TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, date, file_hash)
);

-- ============================================================
-- report_config 表（日報設定，只一筆）
-- ============================================================
CREATE TABLE IF NOT EXISTS report_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN DEFAULT TRUE,
  am_time TEXT DEFAULT '09:00',
  pm_time TEXT DEFAULT '15:00',
  night_time TEXT DEFAULT '20:00'
);

-- ============================================================
-- report_emails 表（收件人）
-- ============================================================
CREATE TABLE IF NOT EXISTS report_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL
);

-- ============================================================
-- 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS records_vendor_date_idx ON records (vendor_id, date);
CREATE INDEX IF NOT EXISTS records_date_idx ON records (date);

-- ============================================================
-- 預設資料
-- ============================================================
INSERT INTO report_config (id, enabled, am_time, pm_time)
VALUES (1, TRUE, '09:00', '15:00')
ON CONFLICT (id) DO NOTHING;

-- 預設 superadmin 帳號：admin / admin
-- bcrypt hash of 'admin' with cost 10
INSERT INTO accounts (account, password_hash, display_name, role)
VALUES (
  'admin',
  '$2b$10$xSIE6Zo/4.QcI4vqTxTN9eTQSYSQnLq4h25FfoPELAD.00FLFzOn2',
  '系統管理員',
  'superadmin'
)
ON CONFLICT (account) DO NOTHING;

-- ============================================================
-- RLS（Row Level Security）
-- 全部由 API Routes 使用 service role key 存取，直接停用 RLS
-- ============================================================
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE records DISABLE ROW LEVEL SECURITY;
ALTER TABLE report_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE report_emails DISABLE ROW LEVEL SECURITY;
