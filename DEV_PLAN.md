# 802BP 補強照片上傳系統 — 後台開發提案（DEV_PLAN）

> 狀態：**方向已定案（2026-06-24），開始搭第一週骨架**
> 產出日期：2026-06-24（2026-06-24 更新：鎖定決策）

---

## ★ 已定案決策（2026-06-24，Po 拍板）

1. **酒測系統**：架構保留在本機當參考（`~/code/alcohol-test` 原地凍結、不動），**線上部署全部下架、資料不保留**。
2. **路線 = A（全 JS）**：802BP 後台用 Next.js + Vercel Cron + Resend，**放棄 Streamlit / Mac mini / launchd**。
3. **程式碼**：在 `802BP_補強照片上傳系統/` 開**新 repo**，複製酒測後台程式碼來改接 `hole_uploads`；不改酒測檔。
4. **雲端資源**：**全開新的**——新 Supabase 專案 + 新 Vercel 專案（+ Resend）；舊酒測確認 802BP 沒問題後再下架。
5. **service_role 金鑰**：**放 Vercel 環境變數**，寄送/清除由 Vercel Cron 全自動跑（接受金鑰上雲端）。

→ 架構收斂為：**802BP 獨立 HTML 當廠商前台（靜態） + 酒測後台服務（dashboard / cron-cleanup / cron-report / Resend）改接 `hole_uploads`，同一個 Vercel 專案部署。**

**仍待 Po（不擋第一週骨架，但擋寄送/配號）**：§7 孔號清冊、§5.4 hole_id 中段「057」來源、計價（單價 / 進位 0.1m or 0.01m / 基準）、Resend 寄件網域 + 公司/各廠商收件信箱。

**仍需 Po 親自做（我沒 token）**：建新 Supabase 專案、貼 `supabase_setup.sql`、建新 Vercel 專案與環境變數、Resend 帳號/網域驗證、舊酒測下架。

---
> 配套文件：`802BP_HANDOFF.md`（完整移轉文件）、`802BP_補強照片上傳表.html`(前端，已完成)、`supabase_setup.sql`(占位，待補)
> 既有可重用系統：`~/code/alcohol-test`（酒測系統,Next.js + Supabase + Vercel + Resend）

---

## 0. 一句話

前端已完成。下一步是後台「每週流程」(撈→核對→配號→改檔名→匯出→更新 Excel→打包寄送→排程清除)。本提案先釐清**重用範圍**與**第一週 milestone**,並把所有待拍板決策列清楚再開工。

---

## 1. 先講最重要的架構岔路（需 Po 先拍板）

HANDOFF §8 把後台規劃成 **Streamlit(Python)on Mac mini 內網 + launchd 排程**。但我實際讀了酒測系統 `~/code/alcohol-test`,它「既有的 email 機制」其實是:

| 項目 | 酒測系統實況 | HANDOFF 假設 |
|---|---|---|
| 寄信 | **Resend**(`resend` npm 套件) | 沿用酒測 email |
| 排程 | **Vercel Cron**(`vercel.json` crons) | Mac mini launchd |
| Runtime | **Next.js / TypeScript** | Streamlit / Python |
| service_role 讀取 | `createServerClient()`(`src/lib/supabase.ts`) | Streamlit 內 service_role |
| 清除舊照 | `api/cron/cleanup`(刪 storage + 清 path) | §9 兩週清除 |
| 日報寄送 | `api/cron/report`(Resend html 信) | §8 step 7 寄送 |

→ **「沿用酒測 email 機制」字面上 = 沿用 Resend(JS)**,不是一個可被 Python 直接 import 的模組。所以有三條路:

- **路線 A(全 JS,最大化重用)**:802BP 後台也用 Next.js + Vercel Cron + Resend,直接複製 `cron/report`、`cron/cleanup`、`createServerClient`、xlsx 匯出。每週核對 UI 用一個受密碼保護的 dashboard 頁(酒測已有 `/dashboard` + `auth.ts` 可仿)。**email/排程/清除幾乎零成本重用**,代價是放棄 Streamlit。
- **路線 B(Streamlit 照 HANDOFF)**:人工核對 UI 用 Streamlit(Python 寫 photo viewer + 配號最快),但寄信改用 **Python 重寫一份 Resend 呼叫**(Resend 有 REST API,Python 直接打即可,不需 npm)。排程用 Mac mini launchd。重用的是「Resend 帳號 + 寄信版型邏輯」,不是程式碼。
- **路線 C(混合,我的建議)**:核對與配號這種**重人工互動**的步驟用 Streamlit(§8 step 2–4,看照片配 hole_id 最直覺);**寄信與清除**這種**自動排程**步驟,沿用酒測現成的 Vercel Cron route(§8 step 7、9),由 Streamlit 把整理好的批次寫回 Supabase 一個 `batches` 表,Vercel Cron 撈出來寄。兩邊用 Supabase 當交界。

> 我傾向 **C**:人工核對留在 Mac mini 內網(照片敏感、service_role 不出內網),自動寄送/清除沿用已驗證過的 Resend+Vercel Cron,不重造寄信輪子。但這條岔路會決定第一週要不要先搭 Streamlit,**請 Po 先選 A / B / C**。

---

## 2. 酒測系統可重用清單（已實查 `~/code/alcohol-test`）

| 重用項 | 來源檔 | 怎麼用 |
|---|---|---|
| service_role 連線 | `src/lib/supabase.ts` `createServerClient()` | 後台繞 RLS 讀全部,模式直接照抄 |
| Resend 寄信 + html 版型 | `src/app/api/cron/report/route.ts` | 改 from/subject/收件人,加照片 zip 附件 |
| 收件人管理 | `report_emails` 表 + `api/report-emails` | 802BP 的「公司收件信箱 / 各廠商」沿用同模式 |
| 啟用開關 | `report_config` 表 | 802BP 寄送開關 |
| Storage 清除 + 清 path | `src/app/api/cron/cleanup/route.ts` | §9 兩週清除幾乎照搬(改 5 天→14 天、改表名) |
| Vercel Cron 設定 | `vercel.json` crons | 排程語法模板 |
| xlsx 匯出 | `xlsx` 套件(已在 deps)、`api/export` | §9 主追蹤 Excel 生成 |
| Supabase DDL/RLS 寫法 | `sql/init.sql` | 寫 `supabase_setup.sql` 正本的模板 |
| 後台密碼保護 | `src/lib/auth.ts`(jose + bcrypt)、`middleware.ts` | 若走路線 A 的 dashboard |

> ⚠️ 注意:酒測寄信 `from: 'alcohol-test@yourdomain.com'` 是占位網域;Resend 需驗證寄件網域。802BP 沿用前要確認 Resend 帳號與已驗證網域(列入決策點)。

---

## 3. 第一週 Milestone（路線確定後才開工）

目標:**最小可動的核對台 + 確認 Supabase 連得上 + 看得到當週筆數**,不碰寄信/清除/計價。

1. **建專案骨架**(依路線 A=Next.js dashboard / B、C=Streamlit)。
2. **Supabase 連線**:用 service_role 連既有(或新建)專案,讀 `hole_uploads`。
   - 前置依賴:`supabase_setup.sql` 正本要先有、Supabase 專案要先建(目前都未做,見決策點)。
3. **當週筆數 dashboard**:列出 `status=待核` 的筆數、依 area 分組計數、最近上傳時間。先唯讀,不配號。
4. **照片預覽**:點一筆能用 service_role 下載並顯示完工/遠/近照(驗證私有桶讀取鏈路通)。

驗收:Po 能在內網開後台,看到「本週 N 筆待核」與每筆照片。配號、改檔名、寄送留到第二週。

---

## 4. 待 Po 拍板的決策點（開工前要解）

**架構**
1. **路線 A / B / C**(§1)— 決定第一週搭什麼骨架。
2. **Supabase 專案**:要不要現在建新專案?還是與酒測共用一個專案(分不同表)?(我沒 token、也未拍板,故未呼叫 Supabase API)
3. **Resend 網域**:802BP 寄件用哪個已驗證寄件網域?收件「公司信箱」與「各廠商信箱」實際地址?

**§7 — 孔號前綴對照(唯一懸而未決的技術假設)**
4. **官方孔號清冊**:前端目前用「區號-EL去前導零」自動組前綴,與 Po 範例全吻合,但需與**官方清冊**核對。若有區域前綴實際不同 → 前端 `holePrefix()` 改查表,後台共用同一張對照表。**請提供官方清冊或確認規則一致。**
5. **§5.4 正式 hole_id 中段「057」**:`OP-802BP-1100EL04500-057-1A-001` 的 057 來源(疑為圖號/序),後台配號需要這張對照表才能產生。

**§8 — 計價**
6. **單價**:每孔 / 每公尺周長的單價?
7. **進位**:`perimeter_mm` 進位到 **0.1m 還是 0.01m**?
8. **計價基準**:淨周長,還是含補強搭接?

**§8 — 寄送**
9. **附件切包**:確認 `<9MB` zip + Excel 目錄一起寄;每包含幾孔有無上限?
10. **寄送頻率**:每週固定週幾跑?(對應 Vercel Cron 或 launchd 排程時間)

---

## 5. 風險與備註

- **照片敏感性**:HANDOFF 要求私有桶、service_role 只在內網。若走路線 A(Vercel)寄信,service_role 金鑰會進 Vercel 環境變數(雲端)。若 Po 堅持金鑰不出內網,寄送/清除就得留在 Mac mini(路線 B/C 的 launchd)。**這與「重用 Vercel Cron」直接衝突,§1 路線選擇要連帶考慮。**
- **容量**:1200 孔最壞 2400 張、壓縮後 <1GB,Supabase 免費版可撐(HANDOFF §10),不急著開 Pro。
- **不做版控**:依 Po 指示,此資料夾暫不 git init,等過稿後再決定是否進版控。

---

## 6. 下一步

請 Po 回覆:**(a) 路線 A/B/C、(b) Supabase 是否現在建/共用、(c) §7 孔號清冊、(d) 計價三項、(e) Resend 網域與收件信箱**。
解了這些我就照第一週 milestone 開工。
