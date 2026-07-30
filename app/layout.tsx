import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RetireWise 退休自由試算器',
  description: '不需登入、不上傳資料的退休與財務自由試算工具。',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  )
}
