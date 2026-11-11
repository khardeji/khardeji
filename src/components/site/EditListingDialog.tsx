import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, Edit3, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { governorateLabel, GOVERNORATES, subcategoryLabel, type Listing } from "@/data/catalog";
import { useI18n } from "@/hooks/use-i18n";
import { useCatalog } from "@/lib/catalog-queries";
import { updateMyListing } from "@/lib/listings.functions";
import { UNIT_LABEL, type SaleUnit } from "@/lib/quantity";

const UNITS: SaleUnit[] = ["kg", "tonne", "piece", "lot", "metre", "litre", "m3", "libre"];

export function EditListingDialog({
  listing,
  open,
  onClose,
  onSuccess,
}: {
  listing: Listing | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { t, dir } = useI18n();
  const qc = useQueryClient();
  const executeUpdate = useServerFn(updateMyListing);
  const { categories } = useCatalog();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState<SaleUnit>("piece");
  const [stock, setStock] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (listing) {
      setTitle(t(listing.title));
      setDescription(t(listing.description));
      setCategory(listing.category);
      setSubcategory(listing.subcategory);
      setGovernorate(listing.governorate);
      setCity(t(listing.city));
      setPrice(String(listing.price ?? ""));
      setUnit((listing.unit as SaleUnit) || "piece");
      setStock(String(listing.stock ?? "1"));
    }
  }, [listing]);

  const currentCat = categories.find((c) => c.slug === category);

  const handleSave = async () => {
    if (!listing) return;
    if (!title.trim()) {
      toast.error(t({ ar: "اكتب عنوان للإعلان.", fr: "Veuillez saisir un titre.", en: "Please enter a title." }));
      return;
    }
    const numPrice = Number(price);
    if (!Number.isFinite(numPrice) || numPrice < 0) {
      toast.error(t({ ar: "السعر غير صالح.", fr: "Prix invalide.", en: "Invalid price." }));
      return;
    }

    setBusy(true);
    const res = await executeUpdate({
      data: {
        id: listing.id,
        title: title.trim(),
        description: description.trim(),
        category,
        subcategory,
        governorate,
        city: city.trim(),
        price: numPrice,
        unit,
        stock: unit === "libre" ? 0 : Math.max(1, Math.round(Number(stock) || 1)),
      },
    }).catch(() => ({ ok: false, error: "failed" }) as const);
    setBusy(false);

    if (res.ok) {
      toast.success(
        t({
          ar: "تم حفظ التعديلات! الإعلان في انتظار موافقة الإدارة قبل إعادة نشره.",
          fr: "Modifications enregistrées ! L'annonce est en attente de validation admin.",
          en: "Changes saved! Listing is awaiting admin review before going live.",
        }),
        {
          description: t({
            ar: "سيتم إعلامك فور مراجعة التعديلات وتفعيل الإعلان.",
            fr: "L'annonce sera remise en ligne dès qu'un administrateur aura validé les modifications.",
            en: "The listing will be published once an admin approves the changes.",
          }),
        }
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["me", "listings"] }),
        qc.invalidateQueries({ queryKey: ["me", "overview"] }),
        qc.invalidateQueries({ queryKey: ["catalog"] }),
      ]);
      onSuccess?.();
      onClose();
    } else {
      toast.error(
        t({
          ar: "فشل حفظ التعديلات. تأكد من صحة البيانات وحاول ثانية.",
          fr: "Échec de l'enregistrement des modifications. Réessayez.",
          en: "Failed to save changes. Please try again.",
        })
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent dir={dir} className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="size-5 text-rust" />
            {t({ ar: "تعديل الإعلان", fr: "Modifier l'annonce", en: "Edit listing" })}
          </DialogTitle>
          <DialogDescription>
            {t({
              ar: "قم بتعديل بيانات الإعلان. ستتم مراجعة التعديلات من قبل الإدارة.",
              fr: "Modifiez les informations de votre annonce. Toute modification nécessite une validation.",
              en: "Update your listing info. All edits require administrator approval.",
            })}
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-brass/50 bg-brass/10 text-foreground">
          <AlertCircle className="size-4 text-brass" />
          <AlertTitle className="text-xs font-semibold">
            {t({
              ar: "تنبيه هام حول التعديل",
              fr: "Modération requise après modification",
              en: "Moderation required after editing",
            })}
          </AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground mt-0.5">
            {t({
              ar: "عند حفظ التعديلات، سيتحول الإعلان إلى حالة «قيد المراجعة» ولن يظهر للعموم حتى يقبله المشرف.",
              fr: "Après modification, l'annonce repassera en « En attente de validation » et sera temporairement invisible sur le site public jusqu'à validation admin.",
              en: "After editing, the listing will return to 'Pending review' and be temporarily hidden until an admin approves it.",
            })}
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-2">
          {/* Titre */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">{t({ ar: "عنوان الإعلان", fr: "Titre de l'annonce", en: "Listing title" })}</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} />
          </div>

          {/* Catégorie & Sous-catégorie */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t({ ar: "الصنف", fr: "Catégorie", en: "Category" })}</Label>
              <Select
                value={category}
                onValueChange={(val) => {
                  setCategory(val);
                  const newCat = categories.find((c) => c.slug === val);
                  if (newCat && newCat.subcategories.length > 0) {
                    setSubcategory(newCat.subcategories[0]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {t(c.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t({ ar: "الصنف الفرعي", fr: "Sous-catégorie", en: "Subcategory" })}</Label>
              <Select value={subcategory} onValueChange={setSubcategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(currentCat?.subcategories ?? []).map((sc) => (
                    <SelectItem key={sc} value={sc}>
                      {t(subcategoryLabel(sc))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Gouvernorat & Ville */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t({ ar: "الولاية", fr: "Gouvernorat", en: "Governorate" })}</Label>
              <Select value={governorate} onValueChange={setGovernorate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOVERNORATES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {t(governorateLabel(g))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-city">{t({ ar: "المدينة أو المعتمدية", fr: "Ville ou délégation", en: "City or town" })}</Label>
              <Input id="edit-city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} />
            </div>
          </div>

          {/* Prix, Unité & Stock */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-price">{t({ ar: "السعر (د.ت)", fr: "Prix (DT)", en: "Price (DT)" })}</Label>
              <Input
                id="edit-price"
                type="number"
                min="0"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t({ ar: "وحدة البيع", fr: "Unité de vente", en: "Sale unit" })}</Label>
              <Select value={unit} onValueChange={(u) => setUnit(u as SaleUnit)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {t(UNIT_LABEL[u].long)} ({t(UNIT_LABEL[u].short)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {unit !== "libre" && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-stock">{t({ ar: "الكمية المتوفرة", fr: "Quantité / Stock", en: "Available stock" })}</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  min="1"
                  step="1"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">{t({ ar: "الوصف", fr: "Description détaillée", en: "Detailed description" })}</Label>
            <Textarea
              id="edit-desc"
              rows={5}
              maxLength={4000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-end text-xs text-muted-foreground" dir="ltr">{description.length}/4000</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {t({ ar: "إلغاء", fr: "Annuler", en: "Cancel" })}
          </Button>
          <Button variant="rust" onClick={() => void handleSave()} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Save />}
            {t({ ar: "حفظ وإرسال للمراجعة", fr: "Enregistrer & soumettre", en: "Save & submit" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
