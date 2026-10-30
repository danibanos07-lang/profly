import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

const palettes = [
  "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200",
  "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Initials avatar. We deliberately never show photos of real people. */
export function InitialsAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1 ring-inset ring-black/5 dark:ring-white/10",
        palettes[hash(name) % palettes.length],
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
