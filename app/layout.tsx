import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from 'next-themes'
import { Geist } from 'next/font/google'
import './globals.css'

export const metadata = {
  metadataBase: new URL(
    process.env.BASE_URL || 'https://around-us-ar09b.sevalla.app'
  ),
  title: 'Around Us',
  description: 'Find, plan, and save nature trips with AI.',
}

// Add viewport configuration to prevent mobile zoom issues
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

const geistSans = Geist({
  display: 'swap',
  subsets: ['latin'],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
