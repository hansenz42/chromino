"use client";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchLocale() {
    const next = locale === "zh" ? "en" : "zh";
    // pathname already starts with /zh or /en — swap the prefix
    const newPath = pathname.replace(/^\/(zh|en)/, `/${next}`);
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000`;
    startTransition(() => {
      router.replace(newPath || `/${next}`);
    });
  }

  return (
    <button
      onClick={switchLocale}
      disabled={isPending}
      aria-label="Switch language"
      className="fixed bottom-4 right-4 z-50 h-8 px-3 rounded-full text-xs font-semibold
        bg-surface border border-border text-subtle hover:text-fg hover:border-fg/30
        transition-colors shadow-sm select-none"
    >
      {locale === "zh" ? "EN" : "中文"}
    </button>
  );
}
