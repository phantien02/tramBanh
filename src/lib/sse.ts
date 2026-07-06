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
}
