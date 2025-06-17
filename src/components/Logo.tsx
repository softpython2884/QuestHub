import { Briefcase } from 'lucide-react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export function Logo({ className, iconSize = 24, textSize = 'text-xl' }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <Briefcase size={iconSize} className="text-primary" />
      <span className={`font-bold ${textSize} text-foreground`}>NationQuest Hub</span>
    </Link>
  );
}
