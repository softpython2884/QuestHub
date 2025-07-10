
import { InteractiveBackground } from "@/components/layout/InteractiveBackground";
import type { ReactNode } from "react";

export default function ShowcaseLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col items-center justify-center p-4 overflow-hidden">
        <InteractiveBackground />
        {children}
    </div>
  );
}
