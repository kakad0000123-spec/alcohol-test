---
name: ux-audit
description: 廠商表單手機 UX 截圖巡檢。當 Po 說「UX 巡檢」「截圖檢查表單」「跑一次 ux audit」「看一下手機版長怎樣」時載入。playwright 多尺寸截圖 → audit/<主題>-<日期>/ + notes.md。
---

# 802BP 廠商表單 UX 截圖巡檢

範例產出:`audit/vendor-ux-2026-06-26/`(照這個規格)。**只巡檢不改碼**;要改另開任務。

## 步驟

1. 目標頁:線上 `https://802bp-photos.vercel.app/upload.html`(預設);要驗未部署的改動才用本地 `npm run dev` + `http://localhost:3000/upload.html`
2. playwright 兩種視窗:
   - **390×844**(主流手機)
   - **320×568**(窄屏底線)
3. 固定截這些畫面,檔名照序號(390 用 01–07,320 用 09–10):
   | 檔名 | 畫面 |
   |---|---|
   | `01-start-mobile.png` | 起始畫面 |
   | `02-help-open-mobile.png` | 說明展開 |
   | `03-known-hole-branch-mobile.png` | 「知道孔號」分支 |
   | `04-submit-section-mobile.png` | 送出區塊 |
   | `05-validation-missing-photo-mobile.png` | 缺照片驗證錯誤 |
   | `06-unknown-branch-mobile.png` | 「不知道孔號」分支 |
   | `07-unknown-validation-mobile.png` | 不知道孔號的驗證 |
   | `09-narrow-start-320.png` | 320 窄屏起始 |
   | `10-narrow-known-code-320.png` | 320 窄屏孔號輸入 |
4. 輸出到 `audit/<主題>-<YYYY-MM-DD>/`(日期用 Asia/Taipei)
5. 逐張看截圖寫 `notes.md`:每張一節(觀察 → 問題點 → 建議);結尾列「建議修的優先序」清單
6. 回報:總結問題數、最嚴重的 3 個、notes.md 路徑
