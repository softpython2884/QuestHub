
import { Logo } from '@/components/Logo';

export default function OAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4 pointer-events-none">
      <div className="w-full max-w-md pointer-events-auto">
        <div className="mb-8 flex justify-center">
          <Logo iconSize={32} textSize="text-2xl" />
        </div>
        {children}
      </div>
    </div>
  );
}
