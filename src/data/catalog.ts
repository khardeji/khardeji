// Shared catalogue vocabulary: governorates, subcategory labels, sale types and the Listing shape.
// Listings, categories and prices themselves live in the database (see src/lib/catalog.functions.ts).
import copper from "@/assets/listing-copper.jpg";
import engine from "@/assets/listing-engine.jpg";
import accidentCar from "@/assets/listing-accident-car.jpg";
import aluminium from "@/assets/listing-aluminium.jpg";
import scrapIron from "@/assets/listing-scrap-iron.jpg";
import rims from "@/assets/listing-rims.jpg";
import lathe from "@/assets/listing-lathe.jpg";
import batteries from "@/assets/listing-batteries.jpg";
import moto from "@/assets/listing-moto.jpg";
import gearbox from "@/assets/listing-gearbox.jpg";
import recup from "@/assets/listing-recup.jpg";
import type { Msg } from "@/lib/i18n";
import type { SaleUnit } from "@/lib/quantity";

export const GOVERNORATES = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", "Kairouan",
  "Kasserine", "Kébili", "Le Kef", "Mahdia", "La Manouba", "Médenine", "Monastir", "Nabeul",
  "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
] as const;
export type Governorate = (typeof GOVERNORATES)[number];

const GOV_AR: Record<Governorate, string> = {
  Ariana: "أريانة", "Béja": "باجة", "Ben Arous": "بن عروس", Bizerte: "بنزرت", "Gabès": "قابس", Gafsa: "قفصة",
  Jendouba: "جندوبة", Kairouan: "القيروان", Kasserine: "القصرين", "Kébili": "قبلي", "Le Kef": "الكاف", Mahdia: "المهدية",
  "La Manouba": "منوبة", "Médenine": "مدنين", Monastir: "المنستير", Nabeul: "نابل", Sfax: "صفاقس", "Sidi Bouzid": "سيدي بوزيد",
  Siliana: "سليانة", Sousse: "سوسة", Tataouine: "تطاوين", Tozeur: "توزر", Tunis: "تونس", Zaghouan: "زغوان",
};

export function governorateLabel(g: string): Msg {
  const ar = GOV_AR[g as Governorate] ?? g;
  return { ar, fr: g, en: g };
}

/** URL-safe category key, e.g. "metaux" or "pieces-auto". */
export type CategorySlug = string;

export interface Category {
  slug: CategorySlug;
  name: Msg;
  tagline: Msg;
  image: string;
  /** Stable subcategory keys (French); display with subcategoryLabel(). */
  subcategories: string[];
  sortOrder?: number;
  isActive?: boolean;
}

const SUB: Record<string, Msg> = {
  Fer: { ar: "حديد", fr: "Fer", en: "Iron" },
  Cuivre: { ar: "نحاس", fr: "Cuivre", en: "Copper" },
  Aluminium: { ar: "ألمنيوم", fr: "Aluminium", en: "Aluminium" },
  Inox: { ar: "إينوكس", fr: "Inox", en: "Stainless steel" },
  Laiton: { ar: "نحاس أصفر", fr: "Laiton", en: "Brass" },
  Zinc: { ar: "زنك", fr: "Zinc", en: "Zinc" },
  "Câbles électriques": { ar: "كوابل كهربائية", fr: "Câbles électriques", en: "Electrical cables" },
  "Autres métaux": { ar: "معادن أخرى", fr: "Autres métaux", en: "Other metals" },
  Moteurs: { ar: "محركات", fr: "Moteurs", en: "Engines" },
  "Boîtes de vitesses": { ar: "علب سرعة", fr: "Boîtes de vitesses", en: "Gearboxes" },
  "Portières": { ar: "أبواب", fr: "Portières", en: "Doors" },
  "Pare-chocs": { ar: "صدّامات", fr: "Pare-chocs", en: "Bumpers" },
  Jantes: { ar: "جنط", fr: "Jantes", en: "Rims" },
  Pneus: { ar: "عجلات", fr: "Pneus", en: "Tyres" },
  Batteries: { ar: "بطاريات", fr: "Batteries", en: "Batteries" },
  "Pièces électroniques": { ar: "قطع إلكترونية", fr: "Pièces électroniques", en: "Electronic parts" },
  "Accessoires automobiles": { ar: "إكسسوارات السيارات", fr: "Accessoires automobiles", en: "Car accessories" },
  "Voitures accidentées": { ar: "سيارات مصدومة", fr: "Voitures accidentées", en: "Damaged cars" },
  "Véhicules hors service": { ar: "عربات خارج الخدمة", fr: "Véhicules hors service", en: "Out-of-service vehicles" },
  "Véhicules pour pièces": { ar: "عربات للقطع", fr: "Véhicules pour pièces", en: "Vehicles for parts" },
  Motos: { ar: "دراجات نارية", fr: "Motos", en: "Motorbikes" },
  Camions: { ar: "شاحنات", fr: "Camions", en: "Trucks" },
  Machines: { ar: "آلات", fr: "Machines", en: "Machines" },
  "Équipements": { ar: "معدات", fr: "Équipements", en: "Equipment" },
  "Matériel électrique": { ar: "معدات كهربائية", fr: "Matériel électrique", en: "Electrical equipment" },
  "Matériel de chantier": { ar: "معدات الحضائر", fr: "Matériel de chantier", en: "Construction equipment" },
  Palettes: { ar: "باليتات", fr: "Palettes", en: "Pallets" },
  "Fûts et bidons": { ar: "براميل وبيدونات", fr: "Fûts et bidons", en: "Drums and cans" },
  Bois: { ar: "خشب", fr: "Bois", en: "Wood" },
  Plastiques: { ar: "بلاستيك", fr: "Plastiques", en: "Plastics" },
  Divers: { ar: "متنوع", fr: "Divers", en: "Miscellaneous" },
};

export function subcategoryLabel(key: string): Msg {
  return SUB[key] ?? { ar: key, fr: key, en: key };
}

export type SaleType = "fixe" | "negociable" | "enchere";

export const SALE_TYPE_LABEL: Record<SaleType, Msg> = {
  fixe: { ar: "سعر ثابت", fr: "Prix fixe", en: "Fixed price" },
  negociable: { ar: "سعر قابل للتفاوض", fr: "Prix négociable", en: "Negotiable price" },
  enchere: { ar: "مزايدة", fr: "Enchère", en: "Auction" },
};

export type SellerKind = "particulier" | "pro" | "entreprise";

export const SELLER_KIND_LABEL: Record<SellerKind, Msg> = {
  particulier: { ar: "خاص", fr: "Particulier", en: "Private seller" },
  pro: { ar: "محترف", fr: "Professionnel", en: "Professional" },
  entreprise: { ar: "شركة", fr: "Entreprise", en: "Company" },
};

export interface Seller {
  name: string;
  kind: SellerKind;
  verified: boolean;
  memberSince: string;
  phone: string;
}

export interface DemoBid {
  /** Anonymous bidder letter, or "me" for the visitor. */
  bidder: string;
  amount: number;
  minutesAgo: number;
  bidderId?: string;
  bidderName?: string;
  bidderPhone?: string;
  bidderEmail?: string;
  createdAt?: string;
}

export interface Listing {
  id: string;
  title: Msg;
  description: Msg;
  category: CategorySlug;
  subcategory: string;
  governorate: string;
  city: Msg;
  price: number;
  unit: SaleUnit;
  stock: number;
  saleType: SaleType;
  images: string[];
  publishedAt: string;
  seller: Seller;
  featured?: boolean;
  urgent?: boolean;
  auction?: {
    startPrice: number;
    increment: number;
    reservePrice?: number;
    /** Demo auctions: hours after the visitor opened the site. */
    endsInHours?: number | undefined;
    /** Real auctions: absolute end time (ISO). */
    endsAt?: string | undefined;
    bids: DemoBid[];
  } | undefined;
  status?: ListingStatus;
  ownerId?: string | null;
  moderationNote?: string;
}

export type ListingStatus = "pending" | "approved" | "rejected" | "hidden" | "sold";

export const LISTING_STATUS_LABEL: Record<ListingStatus, Msg> = {
  pending: { ar: "في انتظار المراجعة", fr: "En attente de validation", en: "Awaiting review" },
  approved: { ar: "منشور", fr: "En ligne", en: "Live" },
  rejected: { ar: "مرفوض", fr: "Refusée", en: "Rejected" },
  hidden: { ar: "مخفي", fr: "Masquée", en: "Hidden" },
  sold: { ar: "تباع", fr: "Vendue", en: "Sold" },
};

/** Bundled demo photos, referenced in the database by key (e.g. "listing-copper"). */
export const DEMO_IMAGES: Record<string, string> = {
  "listing-copper": copper,
  "listing-engine": engine,
  "listing-accident-car": accidentCar,
  "listing-aluminium": aluminium,
  "listing-scrap-iron": scrapIron,
  "listing-rims": rims,
  "listing-lathe": lathe,
  "listing-batteries": batteries,
  "listing-moto": moto,
  "listing-gearbox": gearbox,
  "listing-recup": recup,
};

/** Image reference from the database → displayable URL (demo key, or an already-signed/absolute URL). */
export function resolveImage(ref: string): string {
  if (DEMO_IMAGES[ref]) return DEMO_IMAGES[ref];
  // Demo photos saved as Lovable-hosted links (SQL export) → bundled copy, so they also show on other hosts.
  const m = /\/__l5e\/assets-v1\/[^/]+\/([\w-]+)\.\w+$/.exec(ref);
  if (m && DEMO_IMAGES[m[1]!]) return DEMO_IMAGES[m[1]!]!;
  return ref;
}

export function auctionCurrentPrice(l: Listing): number {
  if (!l.auction) return l.price;
  return l.auction.bids.length ? Math.max(...l.auction.bids.map((b) => b.amount)) : l.auction.startPrice;
}

/** All-language text of a listing, for search. */
export function listingSearchText(l: Listing): string {
  const sub = subcategoryLabel(l.subcategory);
  return [...Object.values(l.title), ...Object.values(l.description), ...Object.values(sub)].join(" ").toLowerCase();
}
