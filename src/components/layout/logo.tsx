import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path d="M9 9v8.5a7 7 0 0 0 14 0V9" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx="23" cy="9" r="2.6" className="fill-amber-300" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 rounded-lg font-semibold tracking-tight", className)} aria-label="UniRate">
      <LogoMark />
      <span className="text-[17px]">
        Uni<span className="text-primary">Rate</span>
      </span>
    </Link>
  );
}
