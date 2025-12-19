import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'TIME-SEAL | The Unbreakable Protocol',
  description: 'If I go silent, this speaks for me.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-dark-bg text-neon-green min-h-screen`}>
        <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-dark-surface">
          {children}
        </div>
      </body>
    </html>
  )
}