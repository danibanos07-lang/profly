import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-foreground" />
      <path d="M11 8.5v15M11 16.5l8.5-8M13.6 14l6.4 9.5" fill="none" className="stroke-background" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 rounded-lg font-semibold tracking-tight", className)} aria-label="Kurso">
      <LogoMark />
      <span className="text-[17px]">Kurso</span>
    </Link>
  );
}
