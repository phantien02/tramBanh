import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'Trạm Bánh', description: 'Điều hành tiệm bánh kem' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-gray-100 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
