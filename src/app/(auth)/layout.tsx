export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col px-6 py-8 max-w-md mx-auto">
      {children}
    </main>
  );
}
