import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

/** Password field with a show/hide eye button. */
export function PasswordInput({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  const label = shown
    ? t({ ar: "خبّي كلمة السر", fr: "Masquer le mot de passe", en: "Hide password" })
    : t({ ar: "ورّي كلمة السر", fr: "Afficher le mot de passe", en: "Show password" });
  return (
    <div className="relative" dir="ltr">
      <input {...props} type={shown ? "text" : "password"} className={cn(className, "pe-11")} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={label}
        aria-pressed={shown}
        title={label}
        className="absolute end-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
      >
        {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
