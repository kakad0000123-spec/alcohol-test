#!/bin/bash
# PostToolUse hook:802BP 兩大踩坑防呆(見 CORE_RULES.md「兩個踩過的坑」)
# 1) Supabase service_role client 沒帶 cache:'no-store' → 後台讀到舊資料
# 2) toLocaleString 沒帶 timeZone:'Asia/Taipei' → Vercel UTC 早 8 小時
# exit 2 = 把 stderr 回饋給 Claude(非阻斷,工具已執行完)

input=$(cat)
file=$(echo "$input" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)

[ -z "$file" ] && exit 0
[ ! -f "$file" ] && exit 0
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.html) ;;
  *) exit 0 ;;
esac

warn=""

# 坑 1:supabase client 檔案(或任何 createClient/rest/v1 呼叫)缺 no-store
if grep -qE "createClient|/rest/v1|postgrest" "$file" 2>/dev/null && grep -q "supabase" "$file" 2>/dev/null; then
  if ! grep -q "no-store" "$file"; then
    warn="${warn}⚠️ 踩坑1:$file 有 Supabase client/REST 呼叫但找不到 cache:'no-store' — service_role 請求會被 Next.js 快取,後台讀到舊資料(見 CORE_RULES.md)\n"
  fi
fi

# 坑 2:toLocale*String 該行沒帶 timeZone(逐行啟發式,跨行宣告可能誤報,誤報請確認後忽略)
if grep -nE "toLocale(Date|Time)?String" "$file" 2>/dev/null | grep -v "timeZone" >/dev/null 2>&1; then
  lines=$(grep -nE "toLocale(Date|Time)?String" "$file" | grep -v "timeZone" | cut -d: -f1 | tr '\n' ',' | sed 's/,$//')
  warn="${warn}⚠️ 踩坑2:$file 第 $lines 行有 toLocaleString 但同行沒看到 timeZone:'Asia/Taipei' — Vercel 跑 UTC 會早 8 小時,請確認(見 CORE_RULES.md)\n"
fi

if [ -n "$warn" ]; then
  printf "%b" "$warn" >&2
  exit 2
fi
exit 0
