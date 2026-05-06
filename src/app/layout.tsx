import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Data TecRural - Fitomonitoreo Agrícola',
  description: 'Sistema de monitoreo agrícola con IoT',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}