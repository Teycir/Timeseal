import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { CommandPalette } from './components/CommandPalette'

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
}

export const metadata: Metadata = {
  title: 'TimeSeal | Decentralized Dead Man\'s Switch',
  description: 'Cryptographically encrypt messages released only after a specified time or inactivity.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔒</text></svg>'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${jetbrainsMono.className} min-h-screen bg-dark-bg text-dark-text overflow-x-hidden selection:bg-neon-green/30 selection:text-neon-green`}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#050505',
              border: '1px solid rgba(0, 255, 65, 0.3)',
              color: '#00ff41',
              fontFamily: 'monospace',
              boxShadow: '0 0 15px rgba(0, 255, 65, 0.1)'
            },
          }}
        />
      </body>
    </html>
  )
}