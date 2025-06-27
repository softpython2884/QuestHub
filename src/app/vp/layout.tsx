import { InteractiveBackground } from "@/components/layout/InteractiveBackground";
import type { ReactNode } from "react";

export default function VpLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col items-center justify-center p-4 overflow-hidden">
        <InteractiveBackground />
        {children}
    </div>
  );
}
