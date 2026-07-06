import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data')

export async function GET(_req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  const ten = path.basename(file) // chặn ../
  try {
    const buf = await fs.readFile(path.join(DATA_DIR, 'uploads', ten))
    return new NextResponse(buf, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } })
  } catch {
    return new NextResponse('Không tìm thấy', { status: 404 })
  }
}
