/** @type {import('next').NextConfig} */
const nextConfig = {
  // 後台照片用 service_role 簽名網址（signed URL）顯示，不靠 next/image 遠端白名單。
  // 若日後改用 next/image 顯示 Supabase 圖片，再把 storage host 加進 remotePatterns。
}

export default nextConfig
