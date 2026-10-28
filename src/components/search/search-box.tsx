"use client";

import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CornerDownLeft, Loader2, Search, UserRound } from "lucide-react";
import { useSuggestions } from "./use-suggestions";
import { useI18n } from "@/lib/i18n/client";
import { formatRating } from "@/lib/format";
import { format } from "@/lib/i18n/config";
import type { SuggestItem } from "@/lib/types";
import { cn } from "@/lib/utils";

function hrefFor(item: SuggestItem) {
  return item.kind === "professor" ? `/professors/${item.slug}` : `/courses/${item.slug}`;
}

/**
 * Search input with autocomplete (ARIA 1.2 combobox pattern).
 * Enter on a highlighted suggestion opens it; otherwise goes to /search.
 */
export function SearchBox({
  size = "default",
  defaultValue = "",
  autoFocus = false,
  className,
  onNavigate,
}: {
  size?: "default" | "hero";
  defaultValue?: string;
  autoFocus?: boolean;
  className?: string;
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { items, loading } = useSuggestions(query);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const showList = open && query.trim().length >= 2;
  // The last option is always "see all results".
  const optionCount = items.length + 1;

  function go(href: string) {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (showList && active >= 0 && active < items.length) return go(hrefFor(items[active]));
    const q = query.trim();
    go(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showList) {
      if (event.key === "ArrowDown") setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % optionCount);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? optionCount - 1 : i - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  const hero = size === "hero";
  const professors = items.filter((i) => i.kind === "professor");
  const courses = items.filter((i) => i.kind === "course");

  const renderItem = (item: SuggestItem) => {
    const index = items.indexOf(item);
    return (
      <li
        key={`${item.kind}-${item.id}`}
        id={`${listId}-${index}`}
        role="option"
        aria-selected={active === index}
        onMouseEnter={() => setActive(index)}
        onMouseDown={(e) => {
          e.preventDefault();
          go(hrefFor(item));
        }}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
          active === index && "bg-accent text-accent-foreground",
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {item.kind === "professor" ? <UserRound className="size-4" /> : <BookOpen className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {item.code && <span className="mr-1.5 font-mono text-xs text-muted-foreground">{item.code}</span>}
            {item.title}
          </span>
          {item.subtitle && <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>}
        </span>
        <span className="shrink-0 text-right text-xs text-muted-foreground tabular">
          <span className="block font-semibold text-foreground">{formatRating(item.rating)}</span>
          {format(t.common.reviewsCount, { count: item.review_count })}
        </span>
      </li>
    );
  };

  return (
    <form role="search" onSubmit={submit} className={cn("relative", className)}>
      <div
        className={cn(
          "flex items-center gap-2 border bg-card shadow-soft transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30",
          hero ? "h-14 rounded-2xl pr-2 pl-5 shadow-lift sm:h-16" : "h-10 rounded-xl pr-1 pl-3",
        )}
      >
        <Search className={cn("shrink-0 text-muted-foreground", hero ? "size-5" : "size-4")} aria-hidden />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          aria-label={t.home.searchPlaceholder}
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          value={query}
          placeholder={t.home.searchPlaceholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className={cn(
            "min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden",
            hero ? "text-base sm:text-lg" : "text-sm",
          )}
        />
        {loading && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-label={t.search.searching} />}
        <button
          type="submit"
          className={cn(
            "shrink-0 cursor-pointer rounded-xl bg-primary font-medium text-primary-foreground transition-colors hover:bg-primary/90",
            hero ? "h-10 px-5 text-sm sm:h-12 sm:px-6" : "h-8 px-3 text-xs",
          )}
        >
          {t.common.search}
        </button>
      </div>

      {showList && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-lift animate-in fade-in-0 slide-in-from-top-1">
          <ul id={listId} role="listbox" aria-label={t.search.suggestionsHeading} className="max-h-[60vh] overflow-y-auto p-2">
            {!loading && items.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground" role="presentation">
                {t.search.noResults}
              </li>
            )}
            {professors.length > 0 && (
              <li role="presentation" className="px-3 pt-1 pb-1 text-xs font-medium text-muted-foreground">
                {t.common.professors}
              </li>
            )}
            {professors.map(renderItem)}
            {courses.length > 0 && (
              <li role="presentation" className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                {t.common.courses}
              </li>
            )}
            {courses.map(renderItem)}
            <li
              id={`${listId}-${items.length}`}
              role="option"
              aria-selected={active === items.length}
              onMouseEnter={() => setActive(items.length)}
              onMouseDown={(e) => {
                e.preventDefault();
                go(`/search?q=${encodeURIComponent(query.trim())}`);
              }}
              className={cn(
                "mt-1 flex cursor-pointer items-center justify-between rounded-lg border-t px-3 py-2.5 text-sm text-primary",
                active === items.length && "bg-accent",
              )}
            >
              {t.search.viewAllResults}
              <CornerDownLeft className="size-3.5" />
            </li>
          </ul>
        </div>
      )}
    </form>
  );
}
