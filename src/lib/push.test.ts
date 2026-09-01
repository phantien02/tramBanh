import fs from 'fs'
import os from 'os'
import path from 'path'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'trambanh-push-test-'))

const { guiToiCacMay, layDangKyTheoVaiTro, luuDangKy, pushDaCauHinh } = await import('./push')
const { db } = await import('@/db')
const { pushSubscriptions, users } = await import('@/db/schema')

let bepId: number, quayId: number, quanlyId: number, bepNghiId: number

beforeAll(() => {
  const them = (username: string, vaiTro: 'quay' | 'bep' | 'quanly', active = 1) =>
    db.insert(users).values({ username, passwordHash: 'x', hoTen: username, vaiTro, active }).returning().get().id
  bepId = them('bep-1', 'bep')
  quayId = them('quay-1', 'quay')
  quanlyId = them('ql-1', 'quanly')
  bepNghiId = them('bep-nghi', 'bep', 0) // nhân viên đã nghỉ việc
})

function dangKy(userId: number, endpoint: string) {
  return db
    .insert(pushSubscriptions)
    .values({ userId, endpoint, p256dh: 'khoa-p256dh', auth: 'khoa-auth', taoLuc: Date.now() })
    .returning()
    .get()
}

beforeEach(() => {
  db.delete(pushSubscriptions).run()
})

describe('pushDaCauHinh', () => {
  it('báo chưa cấu hình khi thiếu khóa VAPID', () => {
    const goc = process.env.VAPID_PUBLIC_KEY
    delete process.env.VAPID_PUBLIC_KEY
    expect(pushDaCauHinh()).toBe(false)
    if (goc) process.env.VAPID_PUBLIC_KEY = goc
  })
})

describe('layDangKyTheoVaiTro', () => {
  it('chỉ lấy máy của đúng vai trò được nhắm tới', () => {
    dangKy(bepId, 'may-bep')
    dangKy(quayId, 'may-quay')
    dangKy(quanlyId, 'may-quanly')

    const ds = layDangKyTheoVaiTro(['bep', 'quanly'])

    expect(ds.map((d) => d.endpoint).sort()).toEqual(['may-bep', 'may-quanly'])
  })

  it('bỏ qua nhân viên đã bị khóa', () => {
    dangKy(bepNghiId, 'may-cua-nguoi-da-nghi')

    expect(layDangKyTheoVaiTro(['bep'])).toEqual([])
  })

  it('một người nhiều máy thì lấy đủ các máy', () => {
    dangKy(bepId, 'dien-thoai')
    dangKy(bepId, 'tablet-bep')

    expect(layDangKyTheoVaiTro(['bep'])).toHaveLength(2)
  })
})

describe('guiToiCacMay', () => {
  const noiDung = { vaiTro: ['bep' as const], tieuDe: 'Đơn mới', noiDung: '#3108-02', duongDan: '/quay/don/7' }

  function loi(statusCode: number) {
    return Object.assign(new Error('loi gia lap'), { statusCode })
  }

  it('đếm số máy gửi thành công', async () => {
    dangKy(bepId, 'may-1')
    dangKy(bepId, 'may-2')

    const kq = await guiToiCacMay(layDangKyTheoVaiTro(['bep']), noiDung, async () => {})

    expect(kq.thanhCong).toBe(2)
    expect(kq.daXoa).toBe(0)
  })

  it('xóa đăng ký khi trình duyệt báo endpoint đã chết (410)', async () => {
    dangKy(bepId, 'may-con-song')
    dangKy(bepId, 'may-da-chet')

    const kq = await guiToiCacMay(layDangKyTheoVaiTro(['bep']), noiDung, async (dk) => {
      if (dk.endpoint === 'may-da-chet') throw loi(410)
    })

    expect(kq.thanhCong).toBe(1)
    expect(kq.daXoa).toBe(1)
    expect(layDangKyTheoVaiTro(['bep']).map((d) => d.endpoint)).toEqual(['may-con-song'])
  })

  it('GIỮ đăng ký khi lỗi chỉ là tạm thời (500) — mạng lỗi không phải máy chết', async () => {
    dangKy(bepId, 'may-loi-tam-thoi')

    const kq = await guiToiCacMay(layDangKyTheoVaiTro(['bep']), noiDung, async () => {
      throw loi(500)
    })

    expect(kq.thanhCong).toBe(0)
    expect(kq.daXoa).toBe(0)
    expect(layDangKyTheoVaiTro(['bep'])).toHaveLength(1)
  })

  it('một máy hỏng không chặn các máy còn lại', async () => {
    dangKy(bepId, 'may-1')
    dangKy(bepId, 'may-hong')
    dangKy(bepId, 'may-3')

    const kq = await guiToiCacMay(layDangKyTheoVaiTro(['bep']), noiDung, async (dk) => {
      if (dk.endpoint === 'may-hong') throw loi(500)
    })

    expect(kq.thanhCong).toBe(2)
  })
})

describe('luuDangKy', () => {
  const sub = { endpoint: 'may-cua-toi', keys: { p256dh: 'khoa-1', auth: 'auth-1' } }

  it('lưu đăng ký mới', () => {
    luuDangKy(bepId, sub)

    expect(layDangKyTheoVaiTro(['bep']).map((d) => d.endpoint)).toEqual(['may-cua-toi'])
  })

  it('gọi lại cùng một máy thì CẬP NHẬT, không đẻ dòng thừa', () => {
    luuDangKy(bepId, sub)
    luuDangKy(bepId, sub)
    luuDangKy(bepId, sub)

    expect(layDangKyTheoVaiTro(['bep'])).toHaveLength(1)
  })

  it('cùng máy nhưng người khác đăng nhập thì chuyển chủ, không để người cũ nhận nhầm', () => {
    luuDangKy(bepId, sub)
    luuDangKy(quayId, sub)

    expect(layDangKyTheoVaiTro(['bep'])).toEqual([])
    expect(layDangKyTheoVaiTro(['quay']).map((d) => d.endpoint)).toEqual(['may-cua-toi'])
  })
})
