import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { CommandPalette } from './components/CommandPalette'
import { StructuredData } from './components/StructuredData'
import { Footer } from './components/Footer'
import { BackgroundAudio } from './components/BackgroundAudio'
import { IdleBlur } from './components/IdleBlur'

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://timeseal.dev'),
  title: {
    default: 'TimeSeal - Cryptographic Time-Locked Vault & Dead Man\'s Switch',
    template: '%s | TimeSeal'
  },
  description: 'Secure time-locked encryption vault with dead man\'s switch. Encrypt messages and files that unlock automatically at a future date or after inactivity. Built on Cloudflare edge with AES-GCM encryption.',
  keywords: [
    'time-locked encryption',
    'dead man\'s switch',
    'cryptographic vault',
    'secure message encryption',
    'timed release encryption',
    'future message',
    'crypto inheritance',
    'whistleblower protection',
    'AES-GCM encryption',
    'Cloudflare Workers',
    'zero-trust encryption',
    'split-key cryptography',
    'R2 object lock',
    'WORM storage',
    'time capsule encryption'
  ],
  authors: [{ name: 'TimeSeal' }],
  creator: 'TimeSeal',
  publisher: 'TimeSeal',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://timeseal.dev',
    title: 'TimeSeal - Cryptographic Time-Locked Vault & Dead Man\'s Switch',
    description: 'Secure time-locked encryption vault. Encrypt messages that unlock automatically at a future date or after inactivity. Zero-trust, edge-native encryption.',
    siteName: 'TimeSeal',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'TimeSeal - The Unbreakable Protocol'
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TimeSeal - Cryptographic Time-Locked Vault',
    description: 'Secure time-locked encryption vault with dead man\'s switch. Zero-trust, edge-native encryption.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://timeseal.dev',
  },
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔒</text></svg>',
    apple: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔒</text></svg>'
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <StructuredData />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00ff41" />
      </head>
      <body className={`${jetbrainsMono.className} min-h-screen bg-dark-bg text-dark-text overflow-x-hidden selection:bg-neon-green/30 selection:text-neon-green`}>
        {children}
        <Footer />
        <CommandPalette />
        <BackgroundAudio />
        <IdleBlur />
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