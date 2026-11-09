import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Building2, Loader2, LogOut, MailCheck, Plus, Store, User } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import heroImg from "@/assets/listing-lathe.jpg";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { safeRedirect, useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { pageMeta, type Msg } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Mode = "connexion" | "inscription";

interface ConnexionSearch {
  redirect?: string | undefined;
  raison?: string | undefined;
  mode?: Mode | undefined;
}

export const Route = createFileRoute("/connexion")({
  validateSearch: (s: Record<string, unknown>): ConnexionSearch => ({
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
    raison: typeof s["raison"] === "string" ? s["raison"] : undefined,
    mode: s["mode"] === "inscription" || s["mode"] === "connexion" ? s["mode"] : undefined,
  }),
  head: ({ match }) => ({
    meta: pageMeta(match.context.locale, {
      title: { ar: "الدخول والتسجيل | خردجي", fr: "Connexion et inscription | Khardeji", en: "Sign in and sign up | Khardeji" },
      description: {
        ar: "ادخل ولا اعمل حساب خردجي: خاص، محترف خردة ولا شركة.",
        fr: "Connectez-vous ou créez votre compte Khardeji : particulier, professionnel ferrailleur ou entreprise.",
        en: "Sign in or create your Khardeji account: private seller, scrap professional or company.",
      },
      card: "summary",
    }),
  }),
  component: AuthPage,
});

const field =
  "h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-rust focus:ring-2 focus:ring-rust/25";

const ACCOUNT_TYPES = [
  { id: "particulier", label: { ar: "خاص", fr: "Particulier", en: "Private" }, icon: User },
  { id: "pro", label: { ar: "محترف / صاحب خردة", fr: "Professionnel / Ferrailleur", en: "Professional / Scrap dealer" }, icon: Store },
  { id: "entreprise", label: { ar: "شركة", fr: "Entreprise", en: "Company" }, icon: Building2 },
] as const;

function authErrorMessage(message: string): Msg {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return { ar: "الإيميل ولا كلمة السر غالطين.", fr: "Email ou mot de passe incorrect.", en: "Wrong email or password." };
  if (m.includes("not confirmed")) return { ar: "أكّد الإيميل متاعك قبل ما تدخل (شوف البريد).", fr: "Confirmez votre email avant de vous connecter (vérifiez votre boîte mail).", en: "Confirm your email before signing in (check your inbox)." };
  if (m.includes("already registered") || m.includes("already been registered")) return { ar: "هذا الإيميل عندو حساب. ادخل بيه.", fr: "Cet email a déjà un compte. Connectez-vous.", en: "This email already has an account. Sign in instead." };
  if (m.includes("password") && (m.includes("weak") || m.includes("pwned") || m.includes("least"))) return { ar: "كلمة السر ضعيفة برشا. اختار وحدة أطول وأصعب.", fr: "Mot de passe trop faible. Choisissez-en un plus long et plus difficile.", en: "Password too weak. Choose a longer, harder one." };
  if (m.includes("rate limit") || m.includes("too many")) return { ar: "برشا محاولات. استنّى شوية وعاود.", fr: "Trop de tentatives. Patientez un peu puis réessayez.", en: "Too many attempts. Wait a moment and try again." };
  return { ar: "صار مشكل. عاود جرّب.", fr: "Une erreur est survenue. Réessayez.", en: "Something went wrong. Please try again." };
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const redirectTo = safeRedirect(search.redirect);

  const [tab, setTab] = useState<Mode>(search.mode ?? "connexion");
  const [kind, setKind] = useState<(typeof ACCOUNT_TYPES)[number]["id"]>("particulier");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const goNext = () => navigate({ to: redirectTo, replace: true });

  async function signIn(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return void toast.error(t(authErrorMessage(error.message)));
    toast.success(t({ ar: "مرحبا بيك!", fr: "Bienvenue !", en: "Welcome back!" }));
    goNext();
  }

  async function signUp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name.trim(), phone: `+216 ${phone.trim()}`, account_type: kind },
      },
    });
    setBusy(false);
    if (error) return void toast.error(t(authErrorMessage(error.message)));
    if (data.session) return goNext();
    setSentTo(email.trim());
  }

  async function sendReset(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return void toast.error(t(authErrorMessage(error.message)));
    toast.success(t({ ar: "بعثنالك رابط لتبديل كلمة السر.", fr: "Lien de réinitialisation envoyé.", en: "Reset link sent." }), {
      description: t({ ar: "شوف البريد متاعك.", fr: "Vérifiez votre boîte mail.", en: "Check your inbox." }),
    });
    setForgot(false);
  }

  const spinner = busy ? <Loader2 className="animate-spin" /> : null;

  let panel;
  if (!loading && user) {
    panel = (
      <div className="py-6 text-center">
        <h1 className="text-3xl font-semibold">{t({ ar: "إنت داخل", fr: "Vous êtes connecté", en: "You're signed in" })}</h1>
        <p className="mt-2 text-muted-foreground">{user.email}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild variant="rust"><Link to="/publier"><Plus /> {t({ ar: "انشر إعلان", fr: "Publier une annonce", en: "Post a listing" })}</Link></Button>
          <Button variant="outline" onClick={() => void supabase.auth.signOut()}><LogOut /> {t({ ar: "تسجيل الخروج", fr: "Se déconnecter", en: "Sign out" })}</Button>
        </div>
      </div>
    );
  } else if (sentTo) {
    panel = (
      <div className="py-6 text-center">
        <MailCheck className="mx-auto size-12 text-olive" />
        <h1 className="mt-4 text-3xl font-semibold">{t({ ar: "أكّد الإيميل متاعك", fr: "Confirmez votre email", en: "Confirm your email" })}</h1>
        <p className="mt-3 text-muted-foreground">
          {t({ ar: "بعثنا رابط تأكيد إلى", fr: "Nous avons envoyé un lien de confirmation à", en: "We sent a confirmation link to" })}{" "}
          <span className="font-semibold text-foreground">{sentTo}</span>.{" "}
          {t({ ar: "انزل عليه وبعد ادخل.", fr: "Cliquez dessus puis connectez-vous.", en: "Click it, then sign in." })}
        </p>
        <Button variant="outline" className="mt-6" onClick={() => { setSentTo(null); setTab("connexion"); }}>
          {t({ ar: "ارجع للدخول", fr: "Retour à la connexion", en: "Back to sign in" })}
        </Button>
      </div>
    );
  } else if (forgot) {
    panel = (
      <div>
        <h1 className="text-3xl font-semibold">{t({ ar: "نسيت كلمة السر؟", fr: "Mot de passe oublié ?", en: "Forgot your password?" })}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t({ ar: "اكتب الإيميل متاعك ونبعثولك رابط باش تختار كلمة سر جديدة.", fr: "Saisissez votre email, nous vous enverrons un lien pour choisir un nouveau mot de passe.", en: "Enter your email and we'll send you a link to choose a new password." })}
        </p>
        <form onSubmit={sendReset} className="mt-6 space-y-4">
          <div>
            <label htmlFor="fp-email" className="text-sm font-medium">{t({ ar: "الإيميل", fr: "Email", en: "Email" })}</label>
            <input id="fp-email" type="email" required dir="ltr" className={`${field} mt-1.5`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.tn" />
          </div>
          <Button type="submit" variant="rust" size="lg" className="w-full" disabled={busy}>{spinner} {t({ ar: "ابعث الرابط", fr: "Envoyer le lien", en: "Send link" })}</Button>
          <button type="button" onClick={() => setForgot(false)} className="text-sm text-rust hover:underline">
            {t({ ar: "ارجع للدخول", fr: "Retour à la connexion", en: "Back to sign in" })}
          </button>
        </form>
      </div>
    );
  } else {
    panel = (
      <Tabs value={tab} onValueChange={(v) => setTab(v as Mode)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connexion">{t({ ar: "دخول", fr: "Connexion", en: "Sign in" })}</TabsTrigger>
          <TabsTrigger value="inscription">{t({ ar: "تسجيل", fr: "Inscription", en: "Sign up" })}</TabsTrigger>
        </TabsList>

        <TabsContent value="connexion">
          <h1 className="mt-6 text-3xl font-semibold">{t({ ar: "مرحبا بيك من جديد", fr: "Bon retour", en: "Welcome back" })}</h1>
          <form onSubmit={signIn} className="mt-6 space-y-4">
            <div>
              <label htmlFor="li-email" className="text-sm font-medium">{t({ ar: "الإيميل", fr: "Email", en: "Email" })}</label>
              <input id="li-email" type="email" required dir="ltr" autoComplete="email" className={`${field} mt-1.5`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.tn" />
            </div>
            <div>
              <label htmlFor="li-pw" className="text-sm font-medium">{t({ ar: "كلمة السر", fr: "Mot de passe", en: "Password" })}</label>
              <input id="li-pw" type="password" required dir="ltr" autoComplete="current-password" className={`${field} mt-1.5`} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="button" onClick={() => setForgot(true)} className="text-sm text-rust hover:underline">
              {t({ ar: "نسيت كلمة السر؟", fr: "Mot de passe oublié ?", en: "Forgot password?" })}
            </button>
            <Button type="submit" variant="rust" size="lg" className="w-full" disabled={busy}>{spinner} {t({ ar: "ادخل", fr: "Se connecter", en: "Sign in" })}</Button>
          </form>
        </TabsContent>

        <TabsContent value="inscription">
          <h1 className="mt-6 text-3xl font-semibold">{t({ ar: "اعمل حساب", fr: "Créer un compte", en: "Create an account" })}</h1>
          <form onSubmit={signUp} className="mt-6 space-y-4">
            <fieldset>
              <legend className="text-sm font-medium">{t({ ar: "نوع الحساب", fr: "Type de compte", en: "Account type" })}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {ACCOUNT_TYPES.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setKind(a.id)}
                    aria-pressed={kind === a.id}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border p-3 text-center text-xs font-medium transition",
                      kind === a.id ? "border-rust bg-rust/10 text-rust" : "border-border hover:border-rust/50",
                    )}
                  >
                    <a.icon className="size-5" /> {t(a.label)}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="su-name" className="text-sm font-medium">
                  {kind === "particulier" ? t({ ar: "الاسم واللقب", fr: "Nom complet", en: "Full name" }) : t({ ar: "اسم الشركة", fr: "Raison sociale", en: "Company name" })}
                </label>
                <input id="su-name" required maxLength={120} autoComplete="name" className={`${field} mt-1.5`} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="su-phone" className="text-sm font-medium">{t({ ar: "التلفون", fr: "Téléphone", en: "Phone" })}</label>
                <div className="mt-1.5 flex" dir="ltr">
                  <span className="grid place-items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm">+216</span>
                  <input id="su-phone" type="tel" required pattern="[0-9 ]{8,10}" autoComplete="tel-national" className={`${field} rounded-l-none`} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="22 123 456" />
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="su-email" className="text-sm font-medium">{t({ ar: "الإيميل", fr: "Email", en: "Email" })}</label>
              <input id="su-email" type="email" required dir="ltr" autoComplete="email" className={`${field} mt-1.5`} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label htmlFor="su-pw" className="text-sm font-medium">{t({ ar: "كلمة السر (8 حروف على الأقل)", fr: "Mot de passe (8 caractères min.)", en: "Password (min. 8 characters)" })}</label>
              <input id="su-pw" type="password" required minLength={8} dir="ltr" autoComplete="new-password" className={`${field} mt-1.5`} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" variant="rust" size="lg" className="w-full" disabled={busy}>{spinner} {t({ ar: "اعمل الحساب متاعي", fr: "Créer mon compte", en: "Create my account" })}</Button>
          </form>
        </TabsContent>
      </Tabs>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-0 px-4 py-12 sm:px-6 lg:grid-cols-2">
      <div className="relative isolate hidden overflow-hidden rounded-s-2xl lg:block">
        <img src={heroImg} alt="" width={1024} height={768} className="absolute inset-0 -z-20 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-charcoal via-charcoal/60 to-transparent" />
        <div className="flex h-full flex-col justify-end p-10 text-on-dark">
          <p className="label-stamp text-xs text-brass">{t({ ar: "حساب واحد", fr: "Un seul compte", en: "One account" })}</p>
          <h2 className="mt-2 text-4xl font-semibold">{t({ ar: "مشتري وبائع في نفس الوقت.", fr: "Acheteur et vendeur à la fois.", en: "Buyer and seller at once." })}</h2>
          <p className="mt-3 text-on-dark-muted">
            {t({ ar: "انشر الدفعات متاعك، زايد وتابع طلباتك من بلاصة وحدة.", fr: "Publiez vos lots, enchérissez et suivez vos demandes depuis un même espace.", en: "Post your lots, bid and follow your requests from one place." })}
          </p>
        </div>
      </div>

      <div className="surface-card rounded-2xl p-8 lg:rounded-s-none">
        {search.raison === "publier" && !user && (
          <p className="mb-5 rounded-md border border-brass/50 bg-brass/10 p-3 text-sm">
            {t({ ar: "لازمك حساب باش تنشر إعلان. ادخل ولا اعمل حساب بلاش.", fr: "Un compte est nécessaire pour publier une annonce. Connectez-vous ou créez un compte gratuit.", en: "You need an account to post a listing. Sign in or create a free account." })}
          </p>
        )}
        {panel}
      </div>
    </div>
  );
}
