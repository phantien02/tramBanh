import { dangKy } from '@/lib/sse'

export const dynamic = 'force-dynamic'

export async function GET() {
  const encoder = new TextEncoder()
  let huyDangKy = () => {}
  let timer: ReturnType<typeof setInterval>

  const stream = new ReadableStream({
    start(controller) {
      const gui = (chunk: string) => controller.enqueue(encoder.encode(chunk))
      gui(': ket-noi-thanh-cong\n\n')
      huyDangKy = dangKy({ gui })
      timer = setInterval(() => {
        try { gui(': ping\n\n') } catch { /* đã đóng */ }
      }, 30000)
    },
    cancel() {
      huyDangKy()
      clearInterval(timer)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
