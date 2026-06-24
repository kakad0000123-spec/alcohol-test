# 802BP 部署與啟用步驟（Po 親自做的部分）

> 程式碼骨架我已搭好；下列要帳號權限的步驟需要你做，我沒有 token。
> 全部用**新建的乾淨資源**，不要沿用酒測舊值。

## A. Supabase（新專案）
1. 建新 Supabase 專案。
2. SQL Editor → 貼上 `supabase_setup.sql` 整段執行（建 `hole_uploads` 表、RLS、私有桶 `hole-photos`）。
3. Settings → API 取三個值：`Project URL`、`anon key`、`service_role key`。

## B. 廠商前端表單（`public/upload.html`）
1. 打開 `public/upload.html`，填最上方 `CONFIG`：`SUPABASE_URL`、`SUPABASE_ANON`（= anon key）、`BUCKET=hole-photos`、`TABLE=hole_uploads`、`PROJECT=802BP`。
2. 部署後網址是 `https://<你的網域>/upload.html` → 產 QR 給廠商（基誠／偉翔）。
   - ⚠️ anon key 放前端是設計如此：RLS 只允許 insert，廠商彼此看不到資料。

## C. Vercel（新專案）
1. 把這個資料夾推上 GitHub，Vercel 匯入該 repo（或 `vercel` CLI 部署）。
2. 環境變數（照 `.env.example`，Production + Preview 都設）：
   - `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`
   - `DASHBOARD_PASSWORD`（你進後台輸入的密碼）、`DASHBOARD_TOKEN`（隨機長字串）
   - `CRON_SECRET`（隨機長字串；Vercel Cron 會自動帶這個 header）
   - Resend 那組第二週才需要，先留空。
3. 部署完成：
   - 後台：`https://<網域>/` → 輸入 `DASHBOARD_PASSWORD` → `/dashboard` 看本週筆數。
   - 廠商表單：`https://<網域>/upload.html`。
4. `vercel.json` 已設一條 Cron：每週日 18:00（UTC）跑 `/api/cron/cleanup`（兩週緩衝清除）。

## D. 第一週驗收
- [ ] 用無痕視窗開 `/upload.html`，匿名送一筆測試 + 一張照片，成功。
- [ ] 後台登入 `/dashboard`，看得到那筆「本週待核」與照片縮圖（驗證 service_role 讀私有桶通）。
- [ ] 確認廠商端看不到別人資料（RLS）。

## 尚未做（依 DEV_PLAN §4，等你拍板才接）
- 配號 hole_id（需 §7 官方孔號清冊 + §5.4「057」來源）
- 計價（單價 / 進位 0.1m or 0.01m / 基準）
- 打包寄送 cron/report（需 Resend 寄件網域 + 公司/各廠商收件信箱）
