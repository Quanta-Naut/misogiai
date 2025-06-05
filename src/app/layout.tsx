import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AIDebug from '@/components/debug/AIDebug'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LaunchPad - Startup Funding Platform',
  description: 'Connect founders with investors through AI-powered pitch rooms',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        {/* AI Debug Panel - only in development */}
        {process.env.NODE_ENV === 'development' && <AIDebug />}
      </body>
    </html>
  )
}