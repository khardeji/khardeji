import { Check, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/hooks/use-i18n";
import { LOCALE_NAME, LOCALES } from "@/lib/i18n";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={className} aria-label={t({ ar: "تبديل اللغة", fr: "Changer de langue", en: "Change language" })}>
          <Globe /> <span className="font-semibold">{LOCALE_NAME[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => setLocale(l)} lang={l} className="justify-between gap-4">
            {LOCALE_NAME[l]}
            {l === locale && <Check className="size-4 text-rust" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
