export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center relative">
      {/* Centered red glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-red-600/[0.04] dark:bg-red-600/[0.04] blur-[100px] pointer-events-none" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
