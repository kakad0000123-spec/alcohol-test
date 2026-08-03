-- 802BP 狀態用詞遷移：待寄／已寄 → 未請款／已請款
-- 2026-08-03
--
-- 怎麼跑：Supabase 後台 → 左側 SQL Editor → 貼上 → Run。
-- 不跑也沒關係：程式有舊值容錯，畫面與篩選都正常，只是資料庫裡會同時存在新舊兩種值。
--
-- 【重要】程式碼要先部署，再跑這段。順序反了會有幾分鐘篩選撈不到舊資料。
--        （其實兩種順序都安全，因為程式有容錯；這只是比較乾淨的順序。）

begin;

-- 1) 遷移既有資料。執行前應為 130 筆「待寄」、0 筆「已寄」。
update public.hole_uploads set status = '未請款' where status = '待寄';
update public.hole_uploads set status = '已請款' where status = '已寄';

-- 2) 改欄位預設值（原為 '待寄'）。
--    廠商表單每次都會明確帶 status，所以這個預設值平常用不到，
--    但留著舊值＝埋一顆「哪天有人漏帶就產生孤兒值」的雷。
alter table public.hole_uploads alter column status set default '未請款';

commit;

-- 檢查結果：預期 未請款 130 / 已請款 0
select status, count(*) from public.hole_uploads group by status order by status;


-- ─────────────────────────────────────────────────────────────
-- 【可選】把 sent_at 改名成 priced_at
--
-- 現在 sent_at 裡面裝的是「標記已請款的時間」，名字是寄件時代留下來的。
-- 這個欄位是 cron/cleanup 判斷「哪些照片超過 14 天該刪」的依據，名字錯了將來很容易誤判。
-- 這個 repo 叫 alcohol-test 但裡面是 802BP —— 名實不符的虧已經吃過一次。
--
-- ⚠️ 跑這段之前一定要先告訴我，我得同步改程式碼（4 個檔案有引用 sent_at），
--    只改資料庫不改程式 = 後台改狀態與每週清理排程當場壞掉。
-- ─────────────────────────────────────────────────────────────
-- alter table public.hole_uploads rename column sent_at to priced_at;
-- alter index if exists idx_hole_uploads_sent rename to idx_hole_uploads_priced;
