export type SuKien = {
  type: 'don_moi' | 'don_cap_nhat' | 'chuyen_trang_thai' | 'nhac_nho'
  orderId: number
  maDon: string
  trangThai?: string
}

type Client = { gui: (chunk: string) => void }

// giữ qua globalThis để sống sót hot-reload khi dev
const g = globalThis as unknown as { __sseClients?: Set<Client> }
const clients = (g.__sseClients ??= new Set<Client>())

export function dangKy(client: Client): () => void {
  clients.add(client)
  return () => clients.delete(client)
}

export function phatSuKien(e: SuKien): void {
  const chunk = `data: ${JSON.stringify(e)}\n\n`
  for (const c of clients) {
    try { c.gui(chunk) } catch { clients.delete(c) }
  }

  // Thông báo đẩy: bắn-và-quên, KHÔNG await. Việc tạo/sửa đơn không được chậm đi
  // hay hỏng chỉ vì gửi thông báo thất bại. Thiếu khóa VAPID thì bên trong tự
  // thoát ngay, nên máy chủ chưa cấu hình vẫn chạy bình thường.
  //
  // Nạp động để `sse.ts` không kéo theo cả tầng DB — SSE broadcast là việc thuần
  // bộ nhớ, đừng bắt nó phụ thuộc vào những thứ nặng hơn nó.
  void import('./push')
    .then((m) => m.guiPushChoSuKien(e))
    .catch((err) => console.error('[push] không nạp được module:', err))
}
