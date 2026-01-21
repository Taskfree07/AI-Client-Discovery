import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Jobs Pipeline - Lead Generation Platform',
  description: 'AI-powered lead generation and campaign management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
