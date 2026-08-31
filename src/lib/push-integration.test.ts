/**
 * Test tích hợp: chạy ĐÚNG đường đi thật của app (`guiPushChoSuKien` → tra đơn →
 * định tuyến → lấy đăng ký → gửi), với phần mã hóa và ký VAPID do CHÍNH thư viện
 * web-push làm thật (`generateRequestDetails`).
 *
 * Chỉ thay tầng truyền tải: web-push luôn gửi qua HTTPS nên không trỏ vào server
 * giả ở localhost được. Ở đây ta lấy y nguyên request nó dựng ra rồi POST qua HTTP
 * tới server giả — kiểm được header, payload đã mã hóa, và cách xử lý mã lỗi trả về.
 *
 * Test đơn vị ở push.test.ts thay hẳn sender bằng hàm giả nên không chạm tới phần
 * mã hóa. Test này bịt đúng khoảng trống đó.
 */
import crypto from 'crypto'
import fs from 'fs'
import http from 'http'
import os from 'os'
import path from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import webpush from 'web-push'

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'trambanh-push-tich-hop-'))
const khoa = webpush.generateVAPIDKeys()
process.env.VAPID_PUBLIC_KEY = khoa.publicKey
process.env.VAPID_PRIVATE_KEY = khoa.privateKey
process.env.VAPID_SUBJECT = 'mailto:test@tram-banh.local'

const { guiPushChoSuKien, layDangKyTheoVaiTro } = await import('./push')
const { db } = await import('@/db')
const { customers, orders, pushSubscriptions, users } = await import('@/db/schema')

type YeuCau = { url: string; authorization: string; contentEncoding?: string; soByte: number }

let server: http.Server
let cong: number
const daNhan: YeuCau[] = []

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const manh: Buffer[] = []
    req.on('data', (c) => manh.push(c as Buffer))
    req.on('end', () => {
      daNhan.push({
        url: req.url ?? '',
        authorization: String(req.headers.authorization ?? ''),
        contentEncoding: req.headers['content-encoding'] as string | undefined,
        soByte: Buffer.concat(manh).length,
      })
      // Endpoint có chữ "chet" thì giả làm máy đã gỡ app.
      res.writeHead(req.url?.includes('chet') ? 410 : 201).end()
    })
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()))
  cong = (server.address() as { port: number }).port
})

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()))
})

/** Cặp khóa ECDH P-256 thật — đúng loại trình duyệt cấp cho một subscription. */
function khoaMay() {
  const ec = crypto.createECDH('prime256v1')
  ec.generateKeys()
  return {
    p256dh: ec.getPublicKey().toString('base64url'),
    auth: crypto.randomBytes(16).toString('base64url'),
  }
}

let dem = 0
function dungDonMau() {
  dem++
  const bepId = db
    .insert(users)
    .values({ username: 'bep-tich-hop-' + dem, passwordHash: 'x', hoTen: 'Bếp', vaiTro: 'bep' })
    .returning().get().id
  const khachId = db
    .insert(customers).values({ sdt: '090000000' + dem, ten: 'chị Lan' }).returning().get().id
  const donId = db
    .insert(orders)
    .values({
      maDon: '#3108-99-' + dem,
      customerId: khachId,
      nguon: 'zalo',
      ngayGioNhan: new Date('2026-08-31T15:00:00+07:00').getTime(),
      hinhThucNhan: 'tai_tiem',
      tongTien: 220000,
      nguoiTao: bepId,
      createdAt: Date.now(),
    })
    .returning().get().id
  return { bepId, donId }
}

/**
 * Sender cho test: để web-push dựng request THẬT (ký VAPID + mã hóa aes128gcm),
 * rồi gửi phần đó qua HTTP tới server giả. Ném lỗi kèm statusCode y như web-push
 * để nhánh xử lý 410 được chạy thật.
 */
async function guiQuaHttp(dk: { endpoint: string; p256dh: string; auth: string }, payload: string) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!)
  const ct = webpush.generateRequestDetails(
    { endpoint: dk.endpoint, keys: { p256dh: dk.p256dh, auth: dk.auth } },
    payload,
  )
  const ma = await new Promise<number>((giaiQuyet, tuChoi) => {
    const req = http.request(
      ct.endpoint,
      { method: ct.method, headers: ct.headers as http.OutgoingHttpHeaders },
      (res) => {
        res.resume()
        res.on('end', () => giaiQuyet(res.statusCode ?? 0))
      },
    )
    req.on('error', tuChoi)
    req.end(ct.body)
  })
  if (ma >= 400) throw Object.assign(new Error('push service trả ' + ma), { statusCode: ma })
}

describe('đường đi thật của thông báo đẩy', () => {
  it('ký VAPID, mã hóa payload và gửi tới đúng endpoint của máy', async () => {
    const { bepId, donId } = dungDonMau()
    db.insert(pushSubscriptions)
      .values({ userId: bepId, endpoint: `http://127.0.0.1:${cong}/push/may-bep`, ...khoaMay(), taoLuc: Date.now() })
      .run()

    await guiPushChoSuKien({ type: 'don_moi', orderId: donId, maDon: '#3108-99' }, guiQuaHttp)

    const yc = daNhan.find((r) => r.url === '/push/may-bep')
    expect(yc, 'push service giả phải nhận được yêu cầu').toBeDefined()
    expect(yc!.authorization).toMatch(/^vapid /i) // đã ký bằng khóa VAPID
    expect(yc!.contentEncoding).toBe('aes128gcm') // payload đã mã hóa đầu-cuối
    expect(yc!.soByte).toBeGreaterThan(0)
  })

  it('tự xóa đăng ký khi push service trả 410', async () => {
    const { bepId, donId } = dungDonMau()
    db.delete(pushSubscriptions).run()
    db.insert(pushSubscriptions)
      .values({ userId: bepId, endpoint: `http://127.0.0.1:${cong}/push/may-chet`, ...khoaMay(), taoLuc: Date.now() })
      .run()

    await guiPushChoSuKien({ type: 'don_moi', orderId: donId, maDon: '#3108-99' }, guiQuaHttp)

    expect(layDangKyTheoVaiTro(['bep'])).toEqual([])
  })

  it('không gửi gì với sự kiện không đáng làm phiền', async () => {
    const { bepId, donId } = dungDonMau()
    db.delete(pushSubscriptions).run()
    db.insert(pushSubscriptions)
      .values({ userId: bepId, endpoint: `http://127.0.0.1:${cong}/push/khong-duoc-goi`, ...khoaMay(), taoLuc: Date.now() })
      .run()

    await guiPushChoSuKien({ type: 'chuyen_trang_thai', orderId: donId, maDon: '#3108-99', trangThai: 'dang_lam' }, guiQuaHttp)

    expect(daNhan.some((r) => r.url === '/push/khong-duoc-goi')).toBe(false)
  })
})
