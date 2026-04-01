import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServerClient } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'

// GET /api/vendors
export async function GET(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user || user.type !== 'account') {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }

  const db = createServerClient()
  const { data, error } = await db
    .from('vendors')
    .select('id, name, contact, account, created_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ vendors: data })
}

// POST /api/vendors
export async function POST(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user || user.type !== 'account') {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }

  const { name, contact, account, password } = await req.json()
  if (!name || !account || !password) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(password, 10)
  const db = createServerClient()

  const { data, error } = await db
    .from('vendors')
    .insert({ name, contact, account, password_hash })
    .select('id, name, contact, account, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '帳號已存在' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ vendor: data }, { status: 201 })
}
