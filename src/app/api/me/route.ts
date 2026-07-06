import { NextResponse } from 'next/server'
import { layUser, loiJson } from '@/lib/api-helpers'

export async function GET() {
  const user = await layUser()
  return user ? NextResponse.json(user) : loiJson(401, 'Chưa đăng nhập')
}
