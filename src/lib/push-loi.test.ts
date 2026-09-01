import { describe, expect, it } from 'vitest'
import { moTaLoi } from './push-loi'

describe('moTaLoi', () => {
  it('luôn kèm nguyên văn lỗi, không giấu đi', () => {
    const e = Object.assign(new Error('chuyện lạ chưa từng thấy'), { name: 'WeirdError' })
    const m = moTaLoi('subscribe', e)
    expect(m).toContain('WeirdError')
    expect(m).toContain('chuyện lạ chưa từng thấy')
  })

  it('máy còn đăng ký cũ với khóa khác → chỉ cách gỡ', () => {
    const e = Object.assign(
      new Error('Registration failed - A subscription with a different applicationServerKey already exists'),
      { name: 'InvalidStateError' },
    )
    expect(moTaLoi('subscribe', e)).toMatch(/đăng ký cũ|gỡ/i)
  })

  it('trình duyệt chặn quyền → chỉ chỗ bỏ chặn', () => {
    const e = Object.assign(new Error('Registration failed - permission denied'), { name: 'NotAllowedError' })
    expect(moTaLoi('subscribe', e)).toMatch(/chặn/i)
  })

  it('máy Android thiếu dịch vụ đẩy → nói rõ là vấn đề của máy', () => {
    const e = Object.assign(new Error('Registration failed - push service not available'), { name: 'AbortError' })
    expect(moTaLoi('subscribe', e)).toMatch(/dịch vụ đẩy|Google/i)
  })

  it('nêu rõ hỏng ở bước nào', () => {
    const e = new Error('bất kỳ')
    expect(moTaLoi('dangKySW', e)).toMatch(/service worker/i)
    expect(moTaLoi('luuMayChu', e)).toMatch(/máy chủ/i)
  })
})
