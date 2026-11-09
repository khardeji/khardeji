import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { pageMeta } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  head: ({ match }) => ({
    meta: [
      ...pageMeta(match.context.locale, {
        title: { ar: "كلمة سر جديدة | خردجي", fr: "Nouveau mot de passe | Khardeji", en: "New password | Khardeji" },
        description: { ar: "اختار كلمة سر جديدة لحساب خردجي.", fr: "Choisissez un nouveau mot de passe pour votre compte Khardeji.", en: "Choose a new password for your Khardeji account." },
        card: "summary",
      }),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

const field =
  "h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-rust focus:ring-2 focus:ring-rust/25";

function ResetPassword() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // The email link signs the visitor in with a short "recovery" session.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      const isRecoveryLink = window.location.hash.includes("type=recovery");
      setReady(Boolean(data.session) || isRecoveryLink ? true : false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (pw !== pw2) return void toast.error(t({ ar: "كلمتي السر موش كيف كيف.", fr: "Les deux mots de passe ne correspondent pas.", en: "The two passwords don't match." }));
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return void toast.error(t({ ar: "ما نجمناش نبدّلو كلمة السر. اطلب رابط جديد.", fr: "Impossible de changer le mot de passe. Demandez un nouveau lien.", en: "Couldn't change the password. Request a new link." }));
    toast.success(t({ ar: "تبدّلت كلمة السر.", fr: "Mot de passe modifié.", en: "Password updated." }));
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="surface-card p-8">
        <KeyRound className="size-10 text-rust" />
        <h1 className="mt-4 text-3xl font-semibold">{t({ ar: "كلمة سر جديدة", fr: "Nouveau mot de passe", en: "New password" })}</h1>
        {ready === false ? (
          <>
            <p className="mt-3 text-muted-foreground">
              {t({ ar: "الرابط هذا ما عادش صالح ولا وفى وقتو.", fr: "Ce lien n'est plus valide ou a expiré.", en: "This link is no longer valid or has expired." })}
            </p>
            <Button asChild variant="rust" className="mt-6"><Link to="/connexion">{t({ ar: "اطلب رابط جديد", fr: "Demander un nouveau lien", en: "Request a new link" })}</Link></Button>
          </>
        ) : (
          <form onSubmit={save} className="mt-6 space-y-4">
            <div>
              <label htmlFor="np-1" className="text-sm font-medium">{t({ ar: "كلمة السر الجديدة (8 حروف على الأقل)", fr: "Nouveau mot de passe (8 caractères min.)", en: "New password (min. 8 characters)" })}</label>
              <input id="np-1" type="password" required minLength={8} dir="ltr" autoComplete="new-password" className={`${field} mt-1.5`} value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div>
              <label htmlFor="np-2" className="text-sm font-medium">{t({ ar: "عاود اكتبها", fr: "Confirmez-le", en: "Confirm it" })}</label>
              <input id="np-2" type="password" required minLength={8} dir="ltr" autoComplete="new-password" className={`${field} mt-1.5`} value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
            <Button type="submit" variant="rust" size="lg" className="w-full" disabled={busy || ready === null}>
              {busy && <Loader2 className="animate-spin" />} {t({ ar: "سجّل", fr: "Enregistrer", en: "Save" })}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
