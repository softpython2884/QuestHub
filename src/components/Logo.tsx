import { Atom } from 'lucide-react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
  href?: string;
}

export function Logo({ className, iconSize = 24, textSize = 'text-xl', href = "/" }: LogoProps) {
  return (
    <Link href={href} className={`flex items-center gap-2 ${className}`}>
      <Atom size={iconSize} className="text-primary" />
      <span className={`font-bold ${textSize} text-foreground`}>FlowUp</span>
    </Link>
  );
}
