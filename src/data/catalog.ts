// Demo catalogue — all prices are demonstration examples, not market quotes.
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

export type CategorySlug = "metaux" | "pieces-auto" | "vehicules" | "industriel" | "recuperation";

export interface Category {
  slug: CategorySlug;
  name: Msg;
  tagline: Msg;
  image: string;
  /** Stable subcategory keys (French); display with subcategoryLabel(). */
  subcategories: string[];
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

export const CATEGORIES: Category[] = [
  {
    slug: "metaux",
    name: { ar: "خردة ومعادن", fr: "Ferraille et métaux", en: "Scrap and metals" },
    tagline: { ar: "حديد، نحاس، ألمنيوم، إينوكس…", fr: "Fer, cuivre, aluminium, inox…", en: "Iron, copper, aluminium, stainless…" },
    image: scrapIron,
    subcategories: ["Fer", "Cuivre", "Aluminium", "Inox", "Laiton", "Zinc", "Câbles électriques", "Autres métaux"],
  },
  {
    slug: "pieces-auto",
    name: { ar: "قطع غيار السيارات", fr: "Pièces automobiles", en: "Car parts" },
    tagline: { ar: "محركات، علب سرعة، جنط، بطاريات…", fr: "Moteurs, boîtes, jantes, batteries…", en: "Engines, gearboxes, rims, batteries…" },
    image: engine,
    subcategories: [
      "Moteurs", "Boîtes de vitesses", "Portières", "Pare-chocs", "Jantes", "Pneus",
      "Batteries", "Pièces électroniques", "Accessoires automobiles",
    ],
  },
  {
    slug: "vehicules",
    name: { ar: "عربات مصدومة", fr: "Véhicules accidentés", en: "Damaged vehicles" },
    tagline: { ar: "سيارات، موتوات وشاحنات للقطع", fr: "Voitures, motos, camions pour pièces", en: "Cars, motorbikes, trucks for parts" },
    image: accidentCar,
    subcategories: ["Voitures accidentées", "Véhicules hors service", "Véhicules pour pièces", "Motos", "Camions"],
  },
  {
    slug: "industriel",
    name: { ar: "معدات صناعية", fr: "Matériel industriel", en: "Industrial equipment" },
    tagline: { ar: "آلات، معدات، حضائر", fr: "Machines, équipements, chantier", en: "Machines, equipment, construction" },
    image: lathe,
    subcategories: ["Machines", "Équipements", "Matériel électrique", "Matériel de chantier"],
  },
  {
    slug: "recuperation",
    name: { ar: "مواد أخرى للرسكلة", fr: "Autres matériaux", en: "Other materials" },
    tagline: { ar: "باليتات، براميل، خشب، بلاستيك…", fr: "Palettes, fûts, bois, plastiques…", en: "Pallets, drums, wood, plastics…" },
    image: recup,
    subcategories: ["Palettes", "Fûts et bidons", "Bois", "Plastiques", "Divers"],
  },
];

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
}

export interface Listing {
  id: string;
  title: Msg;
  description: Msg;
  category: CategorySlug;
  subcategory: string;
  governorate: Governorate;
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
    endsInHours: number;
    bids: DemoBid[];
  };
}

const sellers = {
  ferrailleSfax: { name: "Ferraille Ben Salah", kind: "pro", verified: true, memberSince: "2023", phone: "+216 74 000 000" },
  autoCasse: { name: "Casse Auto El Amen", kind: "entreprise", verified: true, memberSince: "2022", phone: "+216 71 000 000" },
  particulier: { name: "Mehdi T.", kind: "particulier", verified: false, memberSince: "2025", phone: "+216 22 000 000" },
  recyclage: { name: "Recyclage Cap Bon", kind: "entreprise", verified: true, memberSince: "2024", phone: "+216 72 000 000" },
  atelier: { name: "Atelier Mécanique Hichem", kind: "pro", verified: true, memberSince: "2024", phone: "+216 73 000 000" },
} satisfies Record<string, Seller>;

export const LISTINGS: Listing[] = [
  {
    id: "cuivre-recupere-sfax",
    title: {
      ar: "نحاس مسترجع — خيوط وأنابيب منظفة",
      fr: "Cuivre récupéré — fils et tubes nettoyés",
      en: "Recovered copper — cleaned wires and tubes",
    },
    description: {
      ar: "نحاس مسترجع ومفرز: خيوط مقشرة وأنابيب سباكة. سلعة نظيفة بلا بلاستيك. الوزن في البلاصة وإمكانية الشحن.",
      fr: "Cuivre de récupération trié : fils dénudés et tubes de plomberie. Marchandise propre, sans plastique. Pesée sur place, possibilité de chargement.",
      en: "Sorted recovered copper: stripped wires and plumbing tubes. Clean material, no plastic. Weighed on site, loading available.",
    },
    category: "metaux", subcategory: "Cuivre", governorate: "Sfax",
    city: { ar: "ساقية الزيت", fr: "Sakiet Ezzit", en: "Sakiet Ezzit" },
    price: 28, unit: "kg", stock: 150, saleType: "fixe",
    images: [copper, recup], publishedAt: "2026-11-08", seller: sellers.ferrailleSfax, featured: true,
  },
  {
    id: "aluminium-profiles-nabeul",
    title: {
      ar: "ألمنيوم — بروفيلات وكانيت مضغوطة",
      fr: "Aluminium — profilés et canettes compactées",
      en: "Aluminium — profiles and compacted cans",
    },
    description: {
      ar: "ألمنيوم في بالات وبروفيلات نجارة. مناسب للمسابك. السعر ينقص من 200 كغ فما فوق، قابل للنقاش.",
      fr: "Aluminium en balles et profilés de menuiserie. Idéal pour fonderie. Prix dégressif à partir de 200 kg, à discuter.",
      en: "Baled aluminium and window profiles. Ideal for foundries. Volume pricing from 200 kg, open to discussion.",
    },
    category: "metaux", subcategory: "Aluminium", governorate: "Nabeul",
    city: { ar: "قرمبالية", fr: "Grombalia", en: "Grombalia" },
    price: 12, unit: "kg", stock: 300, saleType: "negociable",
    images: [aluminium], publishedAt: "2026-11-07", seller: sellers.recyclage,
  },
  {
    id: "moteur-1-6-ben-arous",
    title: {
      ar: "محرك بنزين 1.6 لتر — مفكوك ومجرّب",
      fr: "Moteur essence 1.6 L — démonté, testé",
      en: "1.6 L petrol engine — removed, tested",
    },
    description: {
      ar: "بلوك محرك 1.6 بنزين مفكوك من سيارة 2016. الكومبريسيون مجرّبة. يُباع بلا إكسسوارات. فاتورة الكاس متوفرة.",
      fr: "Bloc moteur 1.6 essence démonté d'un véhicule de 2016. Compression testée. Vendu sans accessoires. Facture de la casse fournie.",
      en: "1.6 petrol engine block removed from a 2016 car. Compression tested. Sold without accessories. Scrapyard invoice provided.",
    },
    category: "pieces-auto", subcategory: "Moteurs", governorate: "Ben Arous",
    city: { ar: "مقرين", fr: "Mégrine", en: "Mégrine" },
    price: 450, unit: "piece", stock: 1, saleType: "fixe",
    images: [engine, gearbox], publishedAt: "2026-11-09", seller: sellers.autoCasse,
  },
  {
    id: "voiture-accidentee-sousse",
    title: {
      ar: "سيارة سيدان مصدومة من القدّام — للقطع",
      fr: "Berline accidentée avant — pour pièces",
      en: "Front-damaged saloon — for parts",
    },
    description: {
      ar: "سيدان 2017 مصدومة من القدّام، المحرك سليم والداخل في حالة باهية. البطاقة الرمادية متوفرة، والمنصة تتثبت من ملف الملكية قبل غلق المزايدة.",
      fr: "Berline 2017 accidentée à l'avant, moteur intact, intérieur en bon état. Carte grise disponible, dossier de propriété vérifié par la plateforme avant clôture.",
      en: "2017 saloon with front damage, engine intact, interior in good condition. Registration available; ownership checked by the platform before closing.",
    },
    category: "vehicules", subcategory: "Voitures accidentées", governorate: "Sousse",
    city: { ar: "حمام سوسة", fr: "Hammam Sousse", en: "Hammam Sousse" },
    price: 1500, unit: "piece", stock: 1, saleType: "enchere",
    images: [accidentCar], publishedAt: "2026-11-08", seller: sellers.particulier, featured: true,
    auction: {
      startPrice: 1500, increment: 50, endsInHours: 31,
      bids: [
        { bidder: "A", amount: 1500, minutesAgo: 610 },
        { bidder: "B", amount: 1550, minutesAgo: 420 },
        { bidder: "C", amount: 1650, minutesAgo: 185 },
        { bidder: "D", amount: 1700, minutesAgo: 42 },
      ],
    },
  },
  {
    id: "ferraille-mixte-gabes",
    title: {
      ar: "خردة مختلطة — بوطرات وصفائح",
      fr: "Ferraille mixte — poutrelles et tôles",
      en: "Mixed scrap — beams and sheet metal",
    },
    description: {
      ar: "دفعة خردة من الهدم: بوطرات IPN، صفائح وأنابيب. الشحن بالرافعة متوفر. البيع بالكيلوغرام.",
      fr: "Lot de ferraille issue de démolition : poutrelles IPN, tôles, tubes. Chargement par grue disponible. Vente au kilogramme.",
      en: "Demolition scrap lot: IPN beams, sheets, tubes. Crane loading available. Sold by the kilogram.",
    },
    category: "metaux", subcategory: "Fer", governorate: "Gabès",
    city: { ar: "قابس المدينة", fr: "Gabès Ville", en: "Gabès City" },
    price: 1.2, unit: "kg", stock: 8000, saleType: "fixe",
    images: [scrapIron], publishedAt: "2026-11-06", seller: sellers.ferrailleSfax,
  },
  {
    id: "jantes-alu-16-tunis",
    title: { ar: "4 جنط ألمنيوم 16 بوصة", fr: "4 jantes alu 16 pouces", en: "4 alloy rims, 16 inch" },
    description: {
      ar: "طقم 4 جنط ألمنيوم 16 بوصة، 5x114. آثار استعمال خفيفة، بلا تشقق.",
      fr: "Jeu de 4 jantes aluminium 16\", entraxe 5x114. Légères traces d'usage, aucune fissure.",
      en: "Set of 4 aluminium 16\" rims, 5x114 bolt pattern. Light signs of use, no cracks.",
    },
    category: "pieces-auto", subcategory: "Jantes", governorate: "Tunis",
    city: { ar: "المرسى", fr: "La Marsa", en: "La Marsa" },
    price: 120, unit: "piece", stock: 4, saleType: "negociable",
    images: [rims], publishedAt: "2026-11-09", seller: sellers.particulier, urgent: true,
  },
  {
    id: "tour-parallele-monastir",
    title: { ar: "مخرطة ورشة قديمة — فينتاج", fr: "Tour parallèle d'atelier — vintage", en: "Workshop lathe — vintage" },
    description: {
      ar: "مخرطة متوازية قديمة، طول الشغل 1 متر، تخدم بالتيار الثلاثي. مناسبة للورشة أو للترميم.",
      fr: "Tour parallèle ancien, entre-pointes 1 m, fonctionne en triphasé. Idéal atelier ou restauration.",
      en: "Old centre lathe, 1 m between centres, runs on three-phase power. Ideal for a workshop or restoration.",
    },
    category: "industriel", subcategory: "Machines", governorate: "Monastir",
    city: { ar: "قصر هلال", fr: "Ksar Hellal", en: "Ksar Hellal" },
    price: 3200, unit: "piece", stock: 1, saleType: "enchere",
    images: [lathe], publishedAt: "2026-11-05", seller: sellers.atelier,
    auction: {
      startPrice: 3200, increment: 100, endsInHours: 7.5,
      bids: [
        { bidder: "K", amount: 3200, minutesAgo: 900 },
        { bidder: "M", amount: 3400, minutesAgo: 300 },
      ],
    },
  },
  {
    id: "batteries-usagees-ariana",
    title: {
      ar: "بطاريات سيارات مستعملة — للرسكلة",
      fr: "Batteries auto usagées — pour recyclage",
      en: "Used car batteries — for recycling",
    },
    description: {
      ar: "بطاريات رصاص مستعملة 60–100 أمبير، مخزنة في بلاصة مغطاة. البيع بالقطعة، والاستلام من محترف مرخّص فقط.",
      fr: "Batteries plomb usagées 60–100 Ah, stockées à l'abri. Vente à la pièce, enlèvement par professionnel agréé uniquement.",
      en: "Used lead batteries 60–100 Ah, stored under cover. Sold per piece, collection by a licensed professional only.",
    },
    category: "pieces-auto", subcategory: "Batteries", governorate: "Ariana",
    city: { ar: "رواد", fr: "Raoued", en: "Raoued" },
    price: 40, unit: "piece", stock: 20, saleType: "fixe",
    images: [batteries], publishedAt: "2026-11-08", seller: sellers.autoCasse,
  },
  {
    id: "moto-hors-service-kairouan",
    title: { ar: "موبيلات خارج الخدمة — للقطع", fr: "Mobylette hors service — pour pièces", en: "Out-of-service moped — for parts" },
    description: {
      ar: "موبيلات قديمة خارج الخدمة، المحرك المفكوك معاها. الشاسي في حالة باهية للترميم.",
      fr: "Mobylette ancienne hors service, moteur démonté inclus. Cadre en bon état pour restauration.",
      en: "Old out-of-service moped, removed engine included. Frame in good shape for restoration.",
    },
    category: "vehicules", subcategory: "Motos", governorate: "Kairouan",
    city: { ar: "القيروان", fr: "Kairouan", en: "Kairouan" },
    price: 380, unit: "piece", stock: 1, saleType: "enchere",
    images: [moto], publishedAt: "2026-11-07", seller: sellers.particulier,
    auction: {
      startPrice: 250, increment: 20, endsInHours: 52,
      bids: [
        { bidder: "R", amount: 250, minutesAgo: 1200 },
        { bidder: "S", amount: 300, minutesAgo: 700 },
        { bidder: "R", amount: 340, minutesAgo: 360 },
        { bidder: "T", amount: 380, minutesAgo: 95 },
      ],
    },
  },
  {
    id: "boite-vitesses-manuelle-bizerte",
    title: { ar: "علبة سرعة يدوية 5 سرعات", fr: "Boîte de vitesses manuelle 5 rapports", en: "5-speed manual gearbox" },
    description: {
      ar: "علبة سرعة يدوية 5 سرعات، مفكوكة من سيارة تمشي. ضمان تركيب 15 يوم.",
      fr: "Boîte manuelle 5 vitesses, démontée sur véhicule roulant. Garantie de montage 15 jours.",
      en: "5-speed manual gearbox, removed from a running car. 15-day fitting warranty.",
    },
    category: "pieces-auto", subcategory: "Boîtes de vitesses", governorate: "Bizerte",
    city: { ar: "منزل بورقيبة", fr: "Menzel Bourguiba", en: "Menzel Bourguiba" },
    price: 520, unit: "piece", stock: 2, saleType: "negociable",
    images: [gearbox], publishedAt: "2026-11-04", seller: sellers.atelier,
  },
  {
    id: "lot-recup-nabeul",
    title: {
      ar: "دفعة مواد مسترجعة — باليتات، براميل، كوابل",
      fr: "Lot de récupération — palettes, fûts, câbles",
      en: "Salvage lot — pallets, drums, cables",
    },
    description: {
      ar: "دفعة كاملة: 40 باليتة خشب، 12 برميل بلاستيك 200 لتر، كوابل كهربائية ووصلات نحاس أصفر.",
      fr: "Lot complet : 40 palettes bois, 12 fûts plastique 200 L, câbles électriques et raccords en laiton.",
      en: "Complete lot: 40 wooden pallets, 12 plastic 200 L drums, electrical cables and brass fittings.",
    },
    category: "recuperation", subcategory: "Divers", governorate: "Nabeul",
    city: { ar: "الحمامات", fr: "Hammamet", en: "Hammamet" },
    price: 600, unit: "lot", stock: 1, saleType: "fixe",
    images: [recup], publishedAt: "2026-11-03", seller: sellers.recyclage,
  },
  {
    id: "cables-electriques-sfax",
    title: {
      ar: "كوابل كهربائية مغلفة — بقايا حضائر",
      fr: "Câbles électriques gainés — chutes de chantier",
      en: "Sheathed electrical cables — site offcuts",
    },
    description: {
      ar: "بقايا كوابل كهربائية مغلفة (نحاس)، البيع بالطن لأصحاب الرسكلة.",
      fr: "Chutes de câbles électriques gainés (cuivre), vente à la tonne pour recycleurs.",
      en: "Offcuts of sheathed (copper) electrical cables, sold by the tonne to recyclers.",
    },
    category: "metaux", subcategory: "Câbles électriques", governorate: "Sfax",
    city: { ar: "صفاقس الجنوبية", fr: "Sfax Sud", en: "Sfax South" },
    price: 9500, unit: "tonne", stock: 3, saleType: "enchere",
    images: [recup, copper], publishedAt: "2026-11-09", seller: sellers.ferrailleSfax,
    auction: {
      startPrice: 9500, increment: 250, endsInHours: 20,
      bids: [{ bidder: "F", amount: 9500, minutesAgo: 60 }],
    },
  },
];

export function getListing(id: string): Listing | undefined {
  return LISTINGS.find((l) => l.id === id);
}

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
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
