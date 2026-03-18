import type { Metadata } from 'next'
import { Geist, Geist_Mono, Noto_Sans_Georgian } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const notoSansGeorgian = Noto_Sans_Georgian({ 
  subsets: ["georgian", "latin"],
  variable: "--font-noto-georgian",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: 'MARTE - საწარმოთა მართვის სისტემა',
  description: 'ახალი თაობის საწარმოთა SaaS დაფა კლინიკების, უძრავი ქონების, POS, ინვენტარის და სხვა მოდულების მართვისთვის.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ka" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} ${notoSansGeorgian.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
