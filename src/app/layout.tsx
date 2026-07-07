import type { Metadata } from 'next'
import { Fraunces, Be_Vietnam_Pro, Space_Mono } from 'next/font/google'
import './globals.css'

const display = Fraunces({ subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600', '700'], variable: '--f-display', display: 'swap' })
const body = Be_Vietnam_Pro({ subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600', '700'], variable: '--f-body', display: 'swap' })
const mono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--f-mono', display: 'swap' })

export const metadata: Metadata = { title: 'Trạm Bánh', description: 'Điều hành tiệm bánh 24h' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
