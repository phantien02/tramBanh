export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { quetNhacNho } = await import('./lib/reminder-job')
  const g = globalThis as unknown as { __reminderTimer?: ReturnType<typeof setInterval> }
  if (g.__reminderTimer) return // tránh nhân đôi khi hot-reload
  g.__reminderTimer = setInterval(() => {
    try { quetNhacNho(Date.now()) } catch (e) { console.error('Lỗi job nhắc nhở:', e) }
  }, 60_000)
}
