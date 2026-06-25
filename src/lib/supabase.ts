import { createClient } from '@supabase/supabase-js'

export const TABLE = process.env.SUPABASE_TABLE || 'hole_uploads'
export const BUCKET = process.env.SUPABASE_BUCKET || 'hole-photos'

// 後端 server client（service_role，繞過 RLS、可讀私有照片）
// 在函式內讀 env 並建立，避免 import 期就因缺 env 而丟錯（讓無 env 也能 build）。
// 只在 server component / route handler / cron 內呼叫，金鑰不會送到瀏覽器。
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    // 關閉 Next.js 對底層 PostgREST GET 的 fetch 快取，避免後台讀到舊資料
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: 'no-store' }),
    },
  })
}
