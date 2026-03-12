import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PPL Lead Management",
  description: "Lead distribution and broker management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased ambient-bg`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
          <div className="relative z-10">
            {children}
          </div>
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              style: {
                background: 'rgba(18, 8, 10, 0.9)',
                border: '1px solid rgba(220, 38, 38, 0.12)',
                backdropFilter: 'blur(16px)',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
