import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { hashPassword } from '@/lib/auth'
import { layUser, loiJson } from '@/lib/api-helpers'

export async function GET() {
  const user = await layUser()
  if (user?.vaiTro !== 'quanly') return loiJson(403, 'Chỉ quản lý')
  const ds = db.select().from(users).all().map(({ passwordHash: _bo, ...u }) => u)
  return NextResponse.json({ users: ds })
}

export async function POST(req: NextRequest) {
  const user = await layUser()
  if (user?.vaiTro !== 'quanly') return loiJson(403, 'Chỉ quản lý')
  const { username, password, hoTen, vaiTro } = await req.json()
  if (!username || !password || !hoTen || !['quay', 'bep', 'quanly'].includes(vaiTro)) {
    return loiJson(400, 'Thiếu hoặc sai thông tin')
  }
  try {
    const u = db.insert(users).values({ username, passwordHash: hashPassword(password), hoTen, vaiTro }).returning().get()
    return NextResponse.json({ id: u.id }, { status: 201 })
  } catch {
    return loiJson(409, 'Tên đăng nhập đã tồn tại')
  }
}
