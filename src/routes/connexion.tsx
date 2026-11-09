import { createFileRoute } from "@tanstack/react-router";
import { Building2, Store, User } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import heroImg from "@/assets/listing-lathe.jpg";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion et inscription | Khardeji" },
      { name: "description", content: "Connectez-vous ou créez votre compte Khardeji : particulier, professionnel ferrailleur ou entreprise." },
      { property: "og:title", content: "Connexion Khardeji" },
      { property: "og:description", content: "Créez votre compte pour acheter, vendre et enchérir." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const field =
  "h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-rust focus:ring-2 focus:ring-rust/25";

const ACCOUNT_TYPES = [
  { id: "particulier", label: "Particulier", icon: User },
  { id: "pro", label: "Professionnel / Ferrailleur", icon: Store },
  { id: "entreprise", label: "Entreprise", icon: Building2 },
];

function soon(e: FormEvent) {
  e.preventDefault();
  toast("Comptes bientôt disponibles", { description: "L'inscription ouvrira très prochainement." });
}

function AuthPage() {
  const [kind, setKind] = useState("particulier");
  return (
    <div className="mx-auto grid max-w-6xl gap-0 px-4 py-12 sm:px-6 lg:grid-cols-2">
      <div className="relative isolate hidden overflow-hidden rounded-l-2xl lg:block">
        <img src={heroImg} alt="" width={1024} height={768} className="absolute inset-0 -z-20 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-charcoal via-charcoal/60 to-transparent" />
        <div className="flex h-full flex-col justify-end p-10 text-on-dark">
          <p className="label-stamp text-xs text-brass">Un seul compte</p>
          <h2 className="mt-2 text-4xl font-semibold">Acheteur et vendeur à la fois.</h2>
          <p className="mt-3 text-on-dark-muted">Publiez vos lots, enchérissez et suivez vos demandes depuis un même espace.</p>
        </div>
      </div>

      <div className="surface-card rounded-2xl p-8 lg:rounded-l-none">
        <Tabs defaultValue="connexion">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connexion">Connexion</TabsTrigger>
            <TabsTrigger value="inscription">Inscription</TabsTrigger>
          </TabsList>

          <TabsContent value="connexion">
            <h1 className="mt-6 text-3xl font-semibold">Bon retour</h1>
            <form onSubmit={soon} className="mt-6 space-y-4">
              <div>
                <label htmlFor="li-email" className="text-sm font-medium">Email</label>
                <input id="li-email" type="email" required className={`${field} mt-1.5`} placeholder="vous@exemple.tn" />
              </div>
              <div>
                <label htmlFor="li-pw" className="text-sm font-medium">Mot de passe</label>
                <input id="li-pw" type="password" required className={`${field} mt-1.5`} />
              </div>
              <button type="button" onClick={() => toast("Réinitialisation bientôt disponible")} className="text-sm text-rust hover:underline">Mot de passe oublié ?</button>
              <Button type="submit" variant="rust" size="lg" className="w-full">Se connecter</Button>
            </form>
          </TabsContent>

          <TabsContent value="inscription">
            <h1 className="mt-6 text-3xl font-semibold">Créer un compte</h1>
            <form onSubmit={soon} className="mt-6 space-y-4">
              <fieldset>
                <legend className="text-sm font-medium">Type de compte</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {ACCOUNT_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setKind(t.id)}
                      aria-pressed={kind === t.id}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border p-3 text-center text-xs font-medium transition",
                        kind === t.id ? "border-rust bg-rust/10 text-rust" : "border-border hover:border-rust/50",
                      )}
                    >
                      <t.icon className="size-5" /> {t.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="su-name" className="text-sm font-medium">{kind === "particulier" ? "Nom complet" : "Raison sociale"}</label>
                  <input id="su-name" required className={`${field} mt-1.5`} />
                </div>
                <div>
                  <label htmlFor="su-phone" className="text-sm font-medium">Téléphone</label>
                  <div className="mt-1.5 flex">
                    <span className="grid place-items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm">+216</span>
                    <input id="su-phone" type="tel" required pattern="[0-9 ]{8,10}" className={`${field} rounded-l-none`} placeholder="22 123 456" />
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="su-email" className="text-sm font-medium">Email</label>
                <input id="su-email" type="email" required className={`${field} mt-1.5`} />
              </div>
              <div>
                <label htmlFor="su-pw" className="text-sm font-medium">Mot de passe</label>
                <input id="su-pw" type="password" required minLength={8} className={`${field} mt-1.5`} />
              </div>
              <Button type="submit" variant="rust" size="lg" className="w-full">Créer mon compte</Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
