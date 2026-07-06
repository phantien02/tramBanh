import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import { layUser, loiJson } from '@/lib/api-helpers'

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data')
const KICH_THUOC_TOI_DA = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  const user = await layUser()
  if (!user) return loiJson(401, 'Chưa đăng nhập')
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return loiJson(400, 'Thiếu file')
  if (file.size > KICH_THUOC_TOI_DA) return loiJson(400, 'Ảnh quá lớn (tối đa 10MB)')

  const buf = Buffer.from(await file.arrayBuffer())
  const ten = `anh-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`
  let nen: Buffer
  try {
    nen = await sharp(buf).rotate().resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer()
  } catch {
    return loiJson(400, 'File không phải ảnh hợp lệ')
  }
  await fs.writeFile(path.join(DATA_DIR, 'uploads', ten), nen)
  return NextResponse.json({ filePath: ten })
}
