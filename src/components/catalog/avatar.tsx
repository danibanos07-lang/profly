import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

const palettes = [
  "from-indigo-500/20 to-violet-500/20 text-indigo-700 dark:text-indigo-300",
  "from-emerald-500/20 to-teal-500/20 text-emerald-700 dark:text-emerald-300",
  "from-amber-500/20 to-orange-500/20 text-amber-700 dark:text-amber-300",
  "from-sky-500/20 to-cyan-500/20 text-sky-700 dark:text-sky-300",
  "from-rose-500/20 to-pink-500/20 text-rose-700 dark:text-rose-300",
  "from-fuchsia-500/20 to-purple-500/20 text-fuchsia-700 dark:text-fuchsia-300",
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
        "flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold ring-1 ring-inset ring-black/5 dark:ring-white/10",
        palettes[hash(name) % palettes.length],
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
