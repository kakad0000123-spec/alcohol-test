# 802BP 補強照片上傳系統

管線穿隔柵開孔補強（約 1200 孔，工期至 2026/10）的照片上傳與後台整理系統。
廠商（基誠／偉翔）用手機掃 QR 填表上傳完工照 → 後台每週整理、配孔號、計價、寄回公司、清暫存。

## 架構（2026-06-24 定案）
- **廠商前端**：`public/upload.html`（獨立靜態表單，直接打 Supabase REST/Storage，無 JS 依賴）。
- **後台**：Next.js 14（App Router）+ Supabase（service_role）+ Vercel Cron + Resend。
  - 由酒測系統 `~/code/alcohol-test` 的後台模式複製改接 `hole_uploads`（酒測本機保留當參考、不動）。
- **儲存**：Supabase 當每週暫存（私有桶 `hole-photos`）；永久紀錄在 Po 端 + 主追蹤 Excel。

## 文件
- `802BP_HANDOFF.md` — 完整移轉文件（背景、表單規格、孔號規則、資料模型、後台 9 步流程）。
- `DEV_PLAN.md` — 開發提案、已定案決策、待拍板決策點。
- `DEPLOY.md` — 部署與啟用步驟（Supabase / Vercel / Resend）。
- `supabase_setup.sql` — Supabase 一次設定（建表 + RLS + 私有桶 + 計價/清除查詢）。

## 目前進度（第一週骨架）
已完成（程式碼，**未經實機驗證**，需先 `npm install` + 設定 Supabase 環境變數才能跑）：
- Next.js 專案骨架、Tailwind、TS 設定
- `src/lib/supabase.ts` service_role 連線
- 簡易密碼登入（`/` → `/dashboard`）+ middleware 閘
- `/dashboard`：本週待核照片唯讀檢視（筆數卡片 + 列表 + 私有照片簽名縮圖）
- `/api/cron/cleanup`：兩週緩衝清除（Vercel Cron）

待開發（見 `DEV_PLAN.md` §4，多數卡在待拍板決策）：
配號 hole_id、改檔名、匯出主追蹤 Excel、打包寄送 `/api/cron/report`（Resend）。

## 本機開發
```bash
npm install
cp .env.example .env.local   # 填入新 Supabase 專案的值
npm run dev                  # http://localhost:3000
```
