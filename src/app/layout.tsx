import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jakarta.variable} ${jetbrains.variable} antialiased ambient-bg`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="relative z-10">
            {children}
          </div>
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              className: 'toast-glass',
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
