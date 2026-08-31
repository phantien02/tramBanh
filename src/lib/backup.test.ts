import Database from 'better-sqlite3'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { kiemTraBanSao, taoBanSaoDb, xoayVong } from './backup'

const thuMucTam: string[] = []

function thuMucMoi() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'trambanh-backup-test-'))
  thuMucTam.push(d)
  return d
}

afterEach(() => {
  let d: string | undefined
  while ((d = thuMucTam.pop())) fs.rmSync(d, { recursive: true, force: true })
})

/**
 * Dựng lại đúng tình huống nguy hiểm mà tài liệu đã ghi nhận: dữ liệu vừa ghi
 * còn nằm nguyên trong file `-wal`, chưa gộp vào `.db`. Tắt autocheckpoint để
 * chắc chắn không có gì được gộp, khỏi phụ thuộc may rủi.
 */
function dbCoDuLieuTrongWal(soDong = 500) {
  const dir = thuMucMoi()
  const nguon = path.join(dir, 'tram-banh.db')
  const conn = new Database(nguon)
  conn.pragma('journal_mode = WAL')
  conn.pragma('wal_autocheckpoint = 0')
  conn.exec('create table don (id integer primary key, ten text)')
  const them = conn.prepare('insert into don (ten) values (?)')
  const themNhieu = conn.transaction((n: number) => {
    for (let i = 0; i < n; i++) them.run('don ' + i)
  })
  themNhieu(soDong)
  return { dir, nguon, conn }
}

function demDon(duongDan: string) {
  let c: Database.Database | undefined
  try {
    c = new Database(duongDan, { readonly: true })
    return (c.prepare('select count(*) as n from don').get() as { n: number }).n
  } catch {
    return 0 // chưa có cả bảng
  } finally {
    c?.close()
  }
}

describe('taoBanSaoDb', () => {
  it('giữ đủ dữ liệu còn nằm trong file -wal', () => {
    const { dir, nguon, conn } = dbCoDuLieuTrongWal(500)
    const dich = path.join(dir, 'ban-sao.db')

    taoBanSaoDb(nguon, dich)

    expect(demDon(dich)).toBe(500)
    conn.close()
  })

  it('copy trần mỗi file .db thì MẤT dữ liệu — lý do bắt buộc dùng VACUUM INTO', () => {
    const { dir, nguon, conn } = dbCoDuLieuTrongWal(500)
    const dichTran = path.join(dir, 'copy-tran.db')

    fs.copyFileSync(nguon, dichTran) // đúng cách làm sai: bỏ quên -wal

    expect(demDon(dichTran)).toBeLessThan(500)
    conn.close()
  })

  it('không ghi đè bản sao đã tồn tại', () => {
    const { dir, nguon, conn } = dbCoDuLieuTrongWal(10)
    const dich = path.join(dir, 'ban-sao.db')
    fs.writeFileSync(dich, 'da co san')

    expect(() => taoBanSaoDb(nguon, dich)).toThrow()
    conn.close()
  })
})

describe('kiemTraBanSao', () => {
  it('bản sao đúng thì trả về số dòng từng bảng', () => {
    const { dir, nguon, conn } = dbCoDuLieuTrongWal(120)
    const dich = path.join(dir, 'ban-sao.db')
    taoBanSaoDb(nguon, dich)

    expect(kiemTraBanSao(nguon, dich)).toEqual({ don: 120 })
    conn.close()
  })

  it('ném lỗi khi bản sao hỏng', () => {
    const { dir, nguon, conn } = dbCoDuLieuTrongWal(10)
    const hong = path.join(dir, 'hong.db')
    fs.writeFileSync(hong, 'day khong phai file sqlite')

    expect(() => kiemTraBanSao(nguon, hong)).toThrow()
    conn.close()
  })

  it('ném lỗi khi bản sao thiếu dòng so với bản gốc', () => {
    const { dir, nguon, conn } = dbCoDuLieuTrongWal(50)
    const thieu = path.join(dir, 'thieu.db')
    const c = new Database(thieu)
    c.exec('create table don (id integer primary key, ten text)')
    c.prepare('insert into don (ten) values (?)').run('chi co 1 dong')
    c.close()

    expect(() => kiemTraBanSao(nguon, thieu)).toThrow(/thiếu|lệch/i)
    conn.close()
  })
})

describe('xoayVong', () => {
  function taoFile(dir: string, ten: string, tuoiNgay: number) {
    const p = path.join(dir, ten)
    fs.writeFileSync(p, 'x')
    const t = new Date(Date.now() - tuoiNgay * 86_400_000)
    fs.utimesSync(p, t, t)
    return p
  }

  it('giữ N bản mới nhất, xóa phần còn lại', () => {
    const dir = thuMucMoi()
    taoFile(dir, 'backup-2026-08-31.tar.gz', 0)
    taoFile(dir, 'backup-2026-08-30.tar.gz', 1)
    taoFile(dir, 'backup-2026-08-29.tar.gz', 2)
    taoFile(dir, 'backup-2026-08-28.tar.gz', 3)

    const daXoa = xoayVong(dir, 2)

    expect(fs.readdirSync(dir).sort()).toEqual([
      'backup-2026-08-30.tar.gz',
      'backup-2026-08-31.tar.gz',
    ])
    expect(daXoa).toHaveLength(2)
  })

  it('không đụng vào file khác không phải bản backup', () => {
    const dir = thuMucMoi()
    taoFile(dir, 'backup-2026-08-31.tar.gz', 0)
    taoFile(dir, 'ghi-chu.txt', 5)

    xoayVong(dir, 1)

    expect(fs.existsSync(path.join(dir, 'ghi-chu.txt'))).toBe(true)
  })

  it('giữ nguyên khi số bản còn ít hơn mức giữ lại', () => {
    const dir = thuMucMoi()
    taoFile(dir, 'backup-2026-08-31.tar.gz', 0)

    expect(xoayVong(dir, 30)).toEqual([])
    expect(fs.readdirSync(dir)).toHaveLength(1)
  })
})
