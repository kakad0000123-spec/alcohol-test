import { NextRequest, NextResponse } from 'next/server'

// LINE webhook endpoint - no JWT auth required
// LINE platform sends POST requests without our JWT token
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // TODO: 可在此處理 LINE webhook events (e.g. 取得 groupId)
    // body.events 包含 LINE 的事件列表
    console.log('LINE webhook received:', JSON.stringify(body).slice(0, 200))
  } catch {
    // body 可能不是 JSON，忽略即可
  }
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

// LINE webhook 驗證時也會送 GET
export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
