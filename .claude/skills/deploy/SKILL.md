---
name: deploy
description: 802BP 部署+線上實測一條龍。當 Po 說「部署」「上線」「deploy」「推上去」時載入。build → commit(繁中)→ push → vercel --prod → 線上 curl 全套實測 → devlog。
---

# 802BP 部署 SOP

照順序做,**任一步失敗就停下回報,不往下走**。

1. `npm run build` — 型別+編譯驗證;過不了先修,不准 commit 壞的
2. `git add <改到的檔> && git commit` — **繁中訊息**,一句話講清楚改了什麼
3. `git push origin main` — 走 gh https token(SSH key 不通);remote = `kakad0000123-spec/alcohol-test`
4. 保險:`vercel --prod --yes`(Vercel 專案 `802bp-photos`,projectId `prj_h6evaq44rHXStHnsQEcmhFidEXoR`)
5. **線上實測**(等部署完成後全部打一輪,逐項回報 HTTP code):

   | 檢查 | 指令 | 預期 |
   |---|---|---|
   | 廠商表單 | `curl -s -o /dev/null -w 'HTTP %{http_code}\n' --max-time 10 https://802bp-photos.vercel.app/upload.html` | 200 |
   | 後台守門 | `curl -s -o /dev/null -w 'HTTP %{http_code} → %{redirect_url}\n' --max-time 10 https://802bp-photos.vercel.app/dashboard` | 未登入 30x 轉回 `/` |
   | 登入 API | `curl -s -w '\nHTTP %{http_code}\n' --max-time 10 -X POST https://802bp-photos.vercel.app/api/auth -H 'Content-Type: application/json' -d '{"account":"admin","password":"admin"}'` | 200 |
   | 未授權擋 | `curl -s -w '\nHTTP %{http_code}\n' --max-time 10 https://802bp-photos.vercel.app/api/users` | 401 |

6. 有任何一項不符預期 → **不准說部署成功**,回報差異
7. 收工:`docs/devlog/YYYY-MM-DD_主題.md` 一筆(格式見 CORE_RULES.md 收工規則)

## 注意
- 這次改動若含 schema 變更,先確認 Supabase migration 已跑(見 CORE_RULES.md「Supabase 連線」)
- 改到寄件/cron 相關,額外確認 Vercel Cron 設定沒被動到
