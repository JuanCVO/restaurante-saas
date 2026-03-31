import type { Metadata } from "next"
import { Roboto_Slab } from "next/font/google"
import "./globals.css"

const robotoSlab = Roboto_Slab({
  subsets: ["latin"],
  variable: "--font-roboto-slab",
  weight: ["300", "400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "RestaurantOS",
  description: "Gestiona tu restaurante fácilmente",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={robotoSlab.variable}>
      <body className={robotoSlab.className}>
        {children}
      </body>
    </html>
  )
}