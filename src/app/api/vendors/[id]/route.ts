import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServerClient } from '@/lib/supabase'
import { getAuthUserFromRequest } from '@/lib/auth'

// PUT /api/vendors/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUserFromRequest(req)
  if (!user || user.type !== 'account') {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }

  const { name, contact, account, password } = await req.json()
  const updates: Record<string, string> = {}
  if (name) updates.name = name
  if (contact !== undefined) updates.contact = contact
  if (account) updates.account = account
  if (password) updates.password_hash = await bcrypt.hash(password, 10)

  const db = createServerClient()
  const { data, error } = await db
    .from('vendors')
    .update(updates)
    .eq('id', params.id)
    .select('id, name, contact, account, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: '帳號已存在' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ vendor: data })
}

// DELETE /api/vendors/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUserFromRequest(req)
  if (!user || user.type !== 'account') {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }

  const db = createServerClient()

  // 先刪除 Storage 中的照片
  const { data: records } = await db
    .from('records')
    .select('file_path')
    .eq('vendor_id', params.id)

  if (records && records.length > 0) {
    const paths = records.map(r => r.file_path).filter(Boolean)
    if (paths.length > 0) {
      await db.storage.from('alcohol-photos').remove(paths)
    }
  }

  const { error } = await db.from('vendors').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
