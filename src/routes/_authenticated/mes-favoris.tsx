import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, Heart, Trash2 } from "lucide-react";
import { Loading } from "@/components/admin/shared";
import { AccountNav } from "@/components/site/AccountNav";
import { ListingCard } from "@/components/site/ListingCard";
import { PageHeader } from "@/components/site/SectionHeading";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { catalogQuery, useCatalog } from "@/lib/catalog-queries";
import { useFavorites } from "@/lib/favorites";
import { pageMeta } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/mes-favoris")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  head: ({ match }) => ({
    meta: [
      ...pageMeta(match.context.locale, {
        title: { ar: "مفضلتي | خردجي", fr: "Mes favoris | Khardeji", en: "My favourites | Khardeji" },
        description: {
          ar: "الإعلانات اللي حفظتها في المفضلة متاعك في خردجي.",
          fr: "Les annonces que vous avez enregistrées dans vos favoris Khardeji.",
          en: "The listings you saved to your Khardeji favourites.",
        },
        card: "summary",
      }),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyFavorites,
});

function MyFavorites() {
  const { t } = useI18n();
  const { listings } = useCatalog();
  const { ids, loading, removeFavorite } = useFavorites();

  const saved = ids.map((id) => listings.find((l) => l.id === id)).filter((l) => l !== undefined);
  const unavailableIds = ids.filter((id) => !listings.some((l) => l.id === id));

  return (
    <>
      <PageHeader
        eyebrow={t({ ar: "حسابي", fr: "Mon compte", en: "My account" })}
        title={t({ ar: "مفضلتي", fr: "Mes favoris", en: "My favourites" })}
        intro={t({
          ar: "الإعلانات اللي حفظتها باش ترجعلها مبعد.",
          fr: "Les annonces que vous avez gardées pour plus tard.",
          en: "Listings you saved for later.",
        })}
      />
      <AccountNav current="favoris" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {loading ? (
          <Loading />
        ) : saved.length === 0 && unavailableIds.length === 0 ? (
          <div className="surface-card flex flex-col items-center p-10 text-center">
            <Heart className="size-10 text-rust" />
            <p className="mt-3 text-muted-foreground">
              {t({
                ar: "مازلت ما حفظت حتى إعلان. اضغط على القلب في أي إعلان باش تحفظو.",
                fr: "Aucun favori pour l'instant. Touchez le cœur d'une annonce pour l'enregistrer.",
                en: "No favourites yet. Tap the heart on any listing to save it.",
              })}
            </p>
            <Button asChild variant="rust" className="mt-5">
              <Link to="/annonces">{t({ ar: "شوف الإعلانات", fr: "Voir les annonces", en: "Browse listings" })}</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {saved.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {saved.map((l) => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
            )}

            {unavailableIds.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/40 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <AlertCircle className="size-4 text-brass" />
                  <span>
                    {t({
                      ar: "إعلانات لم تعد متوفرة أو تم بيعها",
                      fr: "Annonces indisponibles ou retirées",
                      en: "Listings no longer available or removed",
                    })}
                  </span>
                </div>
                <ul className="mt-3 divide-y divide-border">
                  {unavailableIds.map((unId) => (
                    <li key={unId} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-muted-foreground">
                        {t({ ar: "إعلان معرف:", fr: "Annonce réf :", en: "Listing ref:" })} {unId}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => removeFavorite(unId)}
                      >
                        <Trash2 className="me-1 size-3.5" />
                        {t({ ar: "حذف من المفضلة", fr: "Retirer des favoris", en: "Remove" })}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
