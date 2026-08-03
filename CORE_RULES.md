# 802BP 補強照片上傳系統 — 專案規則

> ⚠️ 這個 repo 名字叫 **`alcohol-test`**，但內容已經是 **802BP 系統**（2026-06-24 由舊酒測系統 repurpose 而來）。**別被名字騙**，這裡沒有酒測。
> 📌 本檔是 **SSOT**：`CLAUDE.md` 與 `AGENTS.md` 都是指向本檔的 symlink（Claude Code 與 Codex 讀同一份）。**改規則只改本檔。**

## 這是什麼
管線穿隔柵開孔補強的照片上傳系統。廠商（基誠／偉翔）手機掃 QR 填表上傳完工照 → 後台整理、標記請款、清暫存。
定位＝**紀錄 + 收件 + 請款進度追蹤**。**沒有配號、不算金額**（配號與請款金額 Po 另外處理，不要在這個系統做）。

> **2026-08-03 定位修正（墓碑）**：原文是「定位＝紀錄 + 收件 + **寄件**。**沒有配號、沒有計價**」。
> 改的理由：寄件維度上線四個多月**從沒被使用過**（130 筆全是「待寄」、0 筆有 `sent_at`），Po 實際在追的是請款進度。
> 這不是範圍膨脹，是讓欄位對齊現實。界線仍在：**追蹤請款狀態 ≠ 計算請款金額**，金額照舊不做。

## 線上 / 帳密
- 網址：https://802bp-photos.vercel.app
- 後台：`/` 登入，密碼 `admin`（env `DASHBOARD_PASSWORD`）
- 廠商表單：`/upload.html`（產 QR 給廠商的就是這個）

## 架構 / 技術棧
- **廠商前端**：`public/upload.html` — 獨立靜態表單，手機優先，直打 Supabase REST/Storage（無框架）
- **後台**：Next.js 14 App Router（`src/app/...`）— 登入、上傳總覽（篩選/勾選/批次/匯出）、明細、寄件設定、cron
- Supabase（Postgres `hole_uploads` + 私有桶 `hole-photos`）/ Vercel / Vercel Cron / Resend
- 廠商前端與後台**部署在同一個 Vercel 專案**

## 部署流程（每次改完照做；完整 SOP 見專案 skill `/deploy`）
1. `npm run build` 驗證（型別+編譯）
2. `git add … && git commit`（**繁中訊息**）
3. `git push origin main` → Vercel 專案 `802bp-photos` 自動部署；保險再 `vercel --prod --yes`
4. 線上實測（curl / playwright）
- push 走 **gh 的 https token**（SSH key 不通）；remote = `kakad0000123-spec/alcohol-test`
- Vercel projectId `prj_h6evaq44rHXStHnsQEcmhFidEXoR`

## Supabase 連線（建表 / 改 schema 用）
- 專案 ref `dcopfymitvlhncwkkhxi`；**DB 直連已停用**，要走 session pooler：
  `psql "host=aws-1-ap-northeast-1.pooler.supabase.com port=5432 user=postgres.dcopfymitvlhncwkkhxi dbname=postgres sslmode=require"`（DB 密碼問 Po，用完提醒他 reset）
- schema 變更腳本：`supabase_setup.sql`（建表/RLS/桶）、`supabase_phase1.sql`（寄件設定表）

## 資料語意：開孔尺寸有三種形狀
`shape` ∈ 圓 / 矩 / **無開孔**。「無開孔」＝開孔太小不需補強、只補扁鐵（2026-08-03 加）。
- 存值鐵則：`shape` 與 `size_label` 都存字串「無開孔」，`perimeter_mm` 存 **null 不存 0**（沒有周長這個概念，存 0 會汙染平均）；該狀態下**扁鐵必填**（前後端都擋）。
- 不用 `NA`／`N/A` 當存值：pandas 等工具預設把它讀成空值，匯出的 Excel 一經處理就把「刻意標記 vs 漏填」洗掉。
- 統計要排除時**判準用 `shape`（`isNoHole()`），不要用 `perimeter_mm == null`** —— 後者會把真正漏填的一起藏起來。
- **加新形狀時，`src/app/api/records/[id]/route.ts` 的 shape 白名單一定要一起改**，否則紀錄被編輯一次就會靜默清成 null。

## 狀態：未請款 / 已請款（2026-08-03 由「待寄／已寄」改名）
- 常數與判斷一律走 `src/lib/status.ts`（`STATUS_UNBILLED` / `STATUS_BILLED` / `isBilled()`），**不要在各處寫死字串**。
- `isBilled()` 仍認得舊值「已寄」，`statusFilterValues()` 篩選時會展開新舊值——那是遷移期的容錯，確認線上無殘留舊值後可以拿掉。
- **請款判定由 Po（superadmin）手動標記**，廠商不可改狀態。
- ⚠️ **`sent_at` 欄位名沒改**（寄件時代留下的），裡面存的是「標記已請款的時間」。`cron/cleanup` 以它為準，**在請款後 14 天刪掉 Storage 照片**。Po 判斷可接受：廠商要計價本來就得提供表單與照片，手上會有備份。
- 這個排程原本等於空轉（沒人按過已寄、0 筆有 `sent_at`）；改名後開始使用狀態，**它會真的開始刪東西**。

## 權限：廠商能刪自己的紀錄（但已請款的不行）
vendor 可刪「自己 contractor + 尚未請款」的紀錄（填錯要能自己重來，那是他的請款資料）；已請款＝已經算進請款單的憑證，擋掉。改狀態仍 admin only。
**中介層陷阱**：`src/middleware.ts` 的 `SUPERADMIN_PATHS` 若整條列入某 API，handler 內的角色分流永遠跑不到（`/api/records/batch` 已因此踩過一次）。要 vendor 進得去的路由，別放進那個清單，改在 handler 依 op 分流。

## 兩個踩過的坑（別再犯）
- **service_role client 一定要 `cache:'no-store'`**（見 `src/lib/supabase.ts`）；否則 Next.js 會快取底層 PostgREST GET → 後台讀到舊資料、Excel 漏新筆。
- **顯示時間一律帶 `{ timeZone: 'Asia/Taipei' }`**（Vercel 跑 UTC，不帶會早 8 小時）。
- 這兩坑有 PostToolUse hook 防呆（`.claude/hooks/postedit-guards.sh`）：改到相關檔案會自動 grep 警告，看到警告要處理不要無視。

## 收工規則（每次任務結束照做）
- `docs/devlog/YYYY-MM-DD_主題.md` 寫一筆：首行標 `agent: claude` 或 `agent: codex`；三段「做了什麼／為什麼／踩了坑」各 ≤5 行，不貼大段 code；有否決過方案時加第四段「**否決了什麼/為什麼**」（墓碑——被否決的方案是純金 why，防未來重提）。
- 更新 `~/RESUME.md` 的「現在做到哪」+「下一步」+ 更新時間（跨專案入口，不更新＝下個 session 接錯線）；devlog 與 code 同 commit。
- devlog 超過 15 檔或最舊超過 30 天 → 主動提議蒸餾進 `~/wiki` 後 `git rm`（git history 就是備份，敢刪）。
- 有跨專案可重用的結論 → 提議蒸餾進 `~/wiki`。
- UX 巡檢用專案 skill `/ux-audit`（輸出到 `audit/<主題>-<日期>/`）。

## 待辦（Po 已從 UX review 挑過的剩項）
後台搜尋、排序/分頁、弱訊號暫存佇列、鍵盤捷徑；X/Y 分區圖（需 Po 提供各區放大圖 + 確認 X/Y 對應方向）。

**擱置**：自動寄送 `cron/report`——Po（2026-07-09）決定暫緩，改用手動下載（匯出 Excel＋照片打包已足夠），要重啟再說。原本卡 Resend 驗證寄件網域＋收件信箱；線上未建 `/api/cron/report`，只有 `cron/cleanup`（清暫存）在排程、與寄送無關。

## 別做
- **別改 repo / 資料夾名**：會斷 Vercel 的 git 連結，要連帶更新 gh remote，風險>效益。Vercel 顯示名已是 802bp-photos、有本檔說明就夠。
- 死的 scaffold `~/code/802BP_補強照片上傳系統/` 已清除；別在那裡改（不會上線）。
