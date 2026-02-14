import "./globals.css"
import { AuthProvider } from "@/context/AuthContext"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-neutral-200">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
