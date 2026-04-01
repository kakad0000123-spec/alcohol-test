-- Migration: 新增 Night 場次支援
-- 請在 Supabase Dashboard > SQL Editor 執行此腳本

-- 移除舊的 session CHECK 限制（只允許 AM/PM）
ALTER TABLE records DROP CONSTRAINT IF EXISTS records_session_check;

-- 加入新的 CHECK 限制（允許 AM/PM/Night）
ALTER TABLE records ADD CONSTRAINT records_session_check
  CHECK (session IN ('AM', 'PM', 'Night'));
