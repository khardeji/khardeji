import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Ban, Search, ShieldCheck, ShieldOff, Unlock } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SELLER_KIND_LABEL, type SellerKind } from "@/data/catalog";
import { useI18n } from "@/hooks/use-i18n";
import { listAdminUsers, setUserAdmin, setUserBlocked } from "@/lib/admin.functions";
import { field, Loading, Panel, useAction } from "./shared";

const SELF_ERR = { self: { ar: "ما تنجمش تبدّل حسابك إنت.", fr: "Vous ne pouvez pas modifier votre propre compte.", en: "You can't change your own account." } };

export function UsersPanel() {
  const { t, date, num } = useI18n();
  const fetchUsers = useServerFn(listAdminUsers);
  const block = useServerFn(setUserBlocked);
  const makeAdmin = useServerFn(setUserAdmin);
  const act = useAction();
  const [query, setQuery] = useState("");
  const q = useQuery({ queryKey: ["admin", "users"], queryFn: () => fetchUsers() });
  const keys = [["admin", "users"], ["admin", "overview"], ["admin", "listings"]];

  const rows = (q.data ?? []).filter((u) => `${u.email} ${u.fullName} ${u.phone}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Panel
      title={`${t({ ar: "الحسابات", fr: "Comptes", en: "Accounts" })}${q.data ? ` (${num(q.data.length)})` : ""}`}
      action={
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <span className="sr-only">{t({ ar: "لوّج", fr: "Rechercher", en: "Search" })}</span>
          <input className={`${field} ps-9`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t({ ar: "إيمايل، اسم، تليفون…", fr: "Email, nom, téléphone…", en: "Email, name, phone…" })} />
        </label>
      }
    >
      {!q.data ? (
        <Loading error={q.isError} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs text-muted-foreground">
                <th className="py-2 text-start font-medium">{t({ ar: "الحساب", fr: "Compte", en: "Account" })}</th>
                <th className="py-2 text-start font-medium">{t({ ar: "التليفون", fr: "Téléphone", en: "Phone" })}</th>
                <th className="py-2 text-start font-medium">{t({ ar: "النوع", fr: "Type", en: "Type" })}</th>
                <th className="py-2 text-start font-medium">{t({ ar: "إعلانات", fr: "Annonces", en: "Listings" })}</th>
                <th className="py-2 text-start font-medium">{t({ ar: "تسجّل", fr: "Inscrit le", en: "Joined" })}</th>
                <th className="py-2 text-end font-medium">{t({ ar: "إجراءات", fr: "Actions", en: "Actions" })}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-border/60 align-middle">
                  <td className="py-3">
                    <div className="flex flex-wrap items-center gap-1.5 font-medium">
                      {u.fullName || "—"}
                      {u.isAdmin && <Badge variant="rust">Admin</Badge>}
                      {u.isBlocked && <Badge variant="dark">{t({ ar: "مسكّر", fr: "Bloqué", en: "Blocked" })}</Badge>}
                      {u.isSelf && <Badge variant="outline">{t({ ar: "إنت", fr: "Vous", en: "You" })}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground" dir="ltr">{u.email}</div>
                  </td>
                  <td className="py-3" dir="ltr">{u.phone || "—"}</td>
                  <td className="py-3">{t(SELLER_KIND_LABEL[u.accountType as SellerKind] ?? SELLER_KIND_LABEL.particulier)}</td>
                  <td className="py-3">{num(u.listings)}</td>
                  <td className="py-3">{date(u.createdAt)}</td>
                  <td className="py-3">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant={u.isBlocked ? "outline" : "outline-rust"}
                        disabled={u.isSelf}
                        onClick={() => void act(() => block({ data: { userId: u.id, blocked: !u.isBlocked } }), keys, SELF_ERR)}
                      >
                        {u.isBlocked ? <Unlock /> : <Ban />}
                        {u.isBlocked ? t({ ar: "حلّ", fr: "Débloquer", en: "Unblock" }) : t({ ar: "سكّر", fr: "Bloquer", en: "Block" })}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={u.isSelf}
                        onClick={() => void act(() => makeAdmin({ data: { userId: u.id, admin: !u.isAdmin } }), keys, SELF_ERR)}
                      >
                        {u.isAdmin ? <ShieldOff /> : <ShieldCheck />}
                        {u.isAdmin ? t({ ar: "نحّي admin", fr: "Retirer admin", en: "Remove admin" }) : t({ ar: "اعمل admin", fr: "Rendre admin", en: "Make admin" })}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">{t({ ar: "ما فمّا حتى حساب.", fr: "Aucun compte.", en: "No accounts." })}</td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            {t({ ar: "كي تسكّر حساب، الإعلانات المنشورة متاعو تتخبّى.", fr: "Bloquer un compte masque aussi ses annonces en ligne.", en: "Blocking an account also hides its live listings." })}
          </p>
        </div>
      )}
    </Panel>
  );
}
