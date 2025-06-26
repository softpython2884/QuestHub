
import { Logo } from "@/components/Logo";

export default function HlbLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-transparent text-foreground flex flex-col items-center p-4 sm:p-8">
      <header className="w-full max-w-7xl mx-auto mb-8">
          <Logo href="/hlb/1" iconSize={32} textSize="text-2xl" />
      </header>
      <main className="w-full max-w-7xl mx-auto flex-grow flex items-center justify-center">
        {children}
      </main>
    </div>
  );
}
