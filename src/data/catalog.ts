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
import type { SaleUnit } from "@/lib/quantity";

export const GOVERNORATES = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", "Kairouan",
  "Kasserine", "Kébili", "Le Kef", "Mahdia", "La Manouba", "Médenine", "Monastir", "Nabeul",
  "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
] as const;

export type CategorySlug = "metaux" | "pieces-auto" | "vehicules" | "industriel" | "recuperation";

export interface Category {
  slug: CategorySlug;
  name: string;
  tagline: string;
  image: string;
  subcategories: string[];
}

export const CATEGORIES: Category[] = [
  {
    slug: "metaux",
    name: "Ferraille et métaux",
    tagline: "Fer, cuivre, aluminium, inox…",
    image: scrapIron,
    subcategories: ["Fer", "Cuivre", "Aluminium", "Inox", "Laiton", "Zinc", "Câbles électriques", "Autres métaux"],
  },
  {
    slug: "pieces-auto",
    name: "Pièces automobiles",
    tagline: "Moteurs, boîtes, jantes, batteries…",
    image: engine,
    subcategories: [
      "Moteurs", "Boîtes de vitesses", "Portières", "Pare-chocs", "Jantes", "Pneus",
      "Batteries", "Pièces électroniques", "Accessoires automobiles",
    ],
  },
  {
    slug: "vehicules",
    name: "Véhicules accidentés",
    tagline: "Voitures, motos, camions pour pièces",
    image: accidentCar,
    subcategories: ["Voitures accidentées", "Véhicules hors service", "Véhicules pour pièces", "Motos", "Camions"],
  },
  {
    slug: "industriel",
    name: "Matériel industriel",
    tagline: "Machines, équipements, chantier",
    image: lathe,
    subcategories: ["Machines", "Équipements", "Matériel électrique", "Matériel de chantier"],
  },
  {
    slug: "recuperation",
    name: "Autres matériaux",
    tagline: "Palettes, fûts, bois, plastiques…",
    image: recup,
    subcategories: ["Palettes", "Fûts et bidons", "Bois", "Plastiques", "Divers"],
  },
];

export type SaleType = "fixe" | "negociable" | "enchere";

export const SALE_TYPE_LABEL: Record<SaleType, string> = {
  fixe: "Prix fixe",
  negociable: "Prix négociable",
  enchere: "Enchère",
};

export interface Seller {
  name: string;
  kind: "Particulier" | "Professionnel" | "Entreprise";
  verified: boolean;
  memberSince: string;
  phone: string;
}

export interface DemoBid {
  bidder: string;
  amount: number;
  minutesAgo: number;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  category: CategorySlug;
  subcategory: string;
  governorate: (typeof GOVERNORATES)[number];
  city: string;
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
  ferrailleSfax: { name: "Ferraille Ben Salah", kind: "Professionnel", verified: true, memberSince: "2023", phone: "+216 74 000 000" },
  autoCasse: { name: "Casse Auto El Amen", kind: "Entreprise", verified: true, memberSince: "2022", phone: "+216 71 000 000" },
  particulier: { name: "Mehdi T.", kind: "Particulier", verified: false, memberSince: "2025", phone: "+216 22 000 000" },
  recyclage: { name: "Recyclage Cap Bon", kind: "Entreprise", verified: true, memberSince: "2024", phone: "+216 72 000 000" },
  atelier: { name: "Atelier Mécanique Hichem", kind: "Professionnel", verified: true, memberSince: "2024", phone: "+216 73 000 000" },
} satisfies Record<string, Seller>;

export const LISTINGS: Listing[] = [
  {
    id: "cuivre-recupere-sfax",
    title: "Cuivre récupéré — fils et tubes nettoyés",
    description:
      "Cuivre de récupération trié : fils dénudés et tubes de plomberie. Marchandise propre, sans plastique. Pesée sur place, possibilité de chargement.",
    category: "metaux", subcategory: "Cuivre", governorate: "Sfax", city: "Sakiet Ezzit",
    price: 28, unit: "kg", stock: 150, saleType: "fixe",
    images: [copper, recup], publishedAt: "2026-11-08", seller: sellers.ferrailleSfax, featured: true,
  },
  {
    id: "aluminium-profiles-nabeul",
    title: "Aluminium — profilés et canettes compactées",
    description: "Aluminium en balles et profilés de menuiserie. Idéal pour fonderie. Prix dégressif à partir de 200 kg, à discuter.",
    category: "metaux", subcategory: "Aluminium", governorate: "Nabeul", city: "Grombalia",
    price: 12, unit: "kg", stock: 300, saleType: "negociable",
    images: [aluminium], publishedAt: "2026-11-07", seller: sellers.recyclage,
  },
  {
    id: "moteur-1-6-ben-arous",
    title: "Moteur essence 1.6 L — démonté, testé",
    description: "Bloc moteur 1.6 essence démonté d'un véhicule de 2016. Compression testée. Vendu sans accessoires. Facture de la casse fournie.",
    category: "pieces-auto", subcategory: "Moteurs", governorate: "Ben Arous", city: "Mégrine",
    price: 450, unit: "piece", stock: 1, saleType: "fixe",
    images: [engine, gearbox], publishedAt: "2026-11-09", seller: sellers.autoCasse,
  },
  {
    id: "voiture-accidentee-sousse",
    title: "Berline accidentée avant — pour pièces",
    description:
      "Berline 2017 accidentée à l'avant, moteur intact, intérieur en bon état. Carte grise disponible, dossier de propriété vérifié par la plateforme avant clôture.",
    category: "vehicules", subcategory: "Voitures accidentées", governorate: "Sousse", city: "Hammam Sousse",
    price: 1500, unit: "piece", stock: 1, saleType: "enchere",
    images: [accidentCar], publishedAt: "2026-11-08", seller: sellers.particulier, featured: true,
    auction: {
      startPrice: 1500, increment: 50, endsInHours: 31,
      bids: [
        { bidder: "Acheteur A", amount: 1500, minutesAgo: 610 },
        { bidder: "Acheteur B", amount: 1550, minutesAgo: 420 },
        { bidder: "Acheteur C", amount: 1650, minutesAgo: 185 },
        { bidder: "Acheteur D", amount: 1700, minutesAgo: 42 },
      ],
    },
  },
  {
    id: "ferraille-mixte-gabes",
    title: "Ferraille mixte — poutrelles et tôles",
    description: "Lot de ferraille issue de démolition : poutrelles IPN, tôles, tubes. Chargement par grue disponible. Vente au kilogramme.",
    category: "metaux", subcategory: "Fer", governorate: "Gabès", city: "Gabès Ville",
    price: 1.2, unit: "kg", stock: 8000, saleType: "fixe",
    images: [scrapIron], publishedAt: "2026-11-06", seller: sellers.ferrailleSfax,
  },
  {
    id: "jantes-alu-16-tunis",
    title: "4 jantes alu 16 pouces",
    description: "Jeu de 4 jantes aluminium 16\", entraxe 5x114. Légères traces d'usage, aucune fissure.",
    category: "pieces-auto", subcategory: "Jantes", governorate: "Tunis", city: "La Marsa",
    price: 120, unit: "piece", stock: 4, saleType: "negociable",
    images: [rims], publishedAt: "2026-11-09", seller: sellers.particulier, urgent: true,
  },
  {
    id: "tour-parallele-monastir",
    title: "Tour parallèle d'atelier — vintage",
    description: "Tour parallèle ancien, entre-pointes 1 m, fonctionne en triphasé. Idéal atelier ou restauration.",
    category: "industriel", subcategory: "Machines", governorate: "Monastir", city: "Ksar Hellal",
    price: 3200, unit: "piece", stock: 1, saleType: "enchere",
    images: [lathe], publishedAt: "2026-11-05", seller: sellers.atelier,
    auction: {
      startPrice: 3200, increment: 100, endsInHours: 7.5,
      bids: [
        { bidder: "Acheteur K", amount: 3200, minutesAgo: 900 },
        { bidder: "Acheteur M", amount: 3400, minutesAgo: 300 },
      ],
    },
  },
  {
    id: "batteries-usagees-ariana",
    title: "Batteries auto usagées — pour recyclage",
    description: "Batteries plomb usagées 60–100 Ah, stockées à l'abri. Vente à la pièce, enlèvement par professionnel agréé uniquement.",
    category: "pieces-auto", subcategory: "Batteries", governorate: "Ariana", city: "Raoued",
    price: 40, unit: "piece", stock: 20, saleType: "fixe",
    images: [batteries], publishedAt: "2026-11-08", seller: sellers.autoCasse,
  },
  {
    id: "moto-hors-service-kairouan",
    title: "Mobylette hors service — pour pièces",
    description: "Mobylette ancienne hors service, moteur démonté inclus. Cadre en bon état pour restauration.",
    category: "vehicules", subcategory: "Motos", governorate: "Kairouan", city: "Kairouan",
    price: 380, unit: "piece", stock: 1, saleType: "enchere",
    images: [moto], publishedAt: "2026-11-07", seller: sellers.particulier,
    auction: {
      startPrice: 250, increment: 20, endsInHours: 52,
      bids: [
        { bidder: "Acheteur R", amount: 250, minutesAgo: 1200 },
        { bidder: "Acheteur S", amount: 300, minutesAgo: 700 },
        { bidder: "Acheteur R", amount: 340, minutesAgo: 360 },
        { bidder: "Acheteur T", amount: 380, minutesAgo: 95 },
      ],
    },
  },
  {
    id: "boite-vitesses-manuelle-bizerte",
    title: "Boîte de vitesses manuelle 5 rapports",
    description: "Boîte manuelle 5 vitesses, démontée sur véhicule roulant. Garantie de montage 15 jours.",
    category: "pieces-auto", subcategory: "Boîtes de vitesses", governorate: "Bizerte", city: "Menzel Bourguiba",
    price: 520, unit: "piece", stock: 2, saleType: "negociable",
    images: [gearbox], publishedAt: "2026-11-04", seller: sellers.atelier,
  },
  {
    id: "lot-recup-nabeul",
    title: "Lot de récupération — palettes, fûts, câbles",
    description: "Lot complet : 40 palettes bois, 12 fûts plastique 200 L, câbles électriques et raccords en laiton.",
    category: "recuperation", subcategory: "Divers", governorate: "Nabeul", city: "Hammamet",
    price: 600, unit: "lot", stock: 1, saleType: "fixe",
    images: [recup], publishedAt: "2026-11-03", seller: sellers.recyclage,
  },
  {
    id: "cables-electriques-sfax",
    title: "Câbles électriques gainés — chutes de chantier",
    description: "Chutes de câbles électriques gainés (cuivre), vente à la tonne pour recycleurs.",
    category: "metaux", subcategory: "Câbles électriques", governorate: "Sfax", city: "Sfax Sud",
    price: 9500, unit: "tonne", stock: 3, saleType: "enchere",
    images: [recup, copper], publishedAt: "2026-11-09", seller: sellers.ferrailleSfax,
    auction: {
      startPrice: 9500, increment: 250, endsInHours: 20,
      bids: [{ bidder: "Acheteur F", amount: 9500, minutesAgo: 60 }],
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
