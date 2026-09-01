export type BuocPush = 'quyen' | 'dangKySW' | 'subscribe' | 'luuMayChu'

const TEN_BUOC: Record<BuocPush, string> = {
  quyen: 'xin quyền thông báo',
  dangKySW: 'đăng ký service worker',
  subscribe: 'đăng ký nhận thông báo với trình duyệt',
  luuMayChu: 'lưu đăng ký lên máy chủ',
}

/**
 * Đổi lỗi kỹ thuật thành câu người dùng đọc được, kèm lời khuyên nếu nhận ra.
 *
 * Nguyên tắc: **luôn kèm nguyên văn lỗi**. Nuốt lỗi để hiện câu chung chung
 * khiến người dùng bấm nút rồi chẳng biết gì, và người sửa cũng không có manh
 * mối nào — đúng cái bẫy đã làm mất một lượt thử.
 */
export function moTaLoi(buoc: BuocPush, err: unknown): string {
  const e = err as { name?: string; message?: string }
  const ten = e?.name ?? 'Error'
  const loi = e?.message ?? String(err)
  const nguyenVan = `${ten}: ${loi}`

  let khuyen = ''
  if (/different applicationServerKey|different.*sender/i.test(loi)) {
    khuyen =
      'Máy này còn một đăng ký cũ dùng khóa khác. Vào cài đặt trình duyệt, xóa dữ liệu trang này (hoặc gỡ app khỏi Màn hình chính) rồi bật lại.'
  } else if (ten === 'NotAllowedError' || /permission denied/i.test(loi)) {
    khuyen =
      'Trình duyệt đang chặn thông báo cho trang này. Mở cài đặt trang trong trình duyệt và cho phép Thông báo.'
  } else if (/push service|not available|unsupported/i.test(loi)) {
    khuyen =
      'Máy không dùng được dịch vụ đẩy. Trên Android cần có Google Play Services và mạng thông suốt.'
  } else if (/network|failed to fetch/i.test(loi)) {
    khuyen = 'Có vẻ là lỗi mạng. Kiểm tra kết nối rồi thử lại.'
  }

  return `Hỏng ở bước ${TEN_BUOC[buoc]}. ${khuyen}\n\n${nguyenVan}`.replace('. \n', '.\n')
}
