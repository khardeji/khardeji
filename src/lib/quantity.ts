// Rules for buying an exact quantity from a listing's stock.
import type { Msg } from "./i18n";

export type SaleUnit = "piece" | "kg" | "g" | "tonne" | "lot" | "libre";

export const UNIT_LABEL: Record<SaleUnit, { short: Msg; long: Msg; step: number }> = {
  piece: { short: { ar: "قطعة", fr: "pièce", en: "piece" }, long: { ar: "بالقطعة", fr: "À la pièce", en: "Per piece" }, step: 1 },
  kg: { short: { ar: "كغ", fr: "kg", en: "kg" }, long: { ar: "بالكيلوغرام", fr: "Au kilogramme", en: "Per kilogram" }, step: 1 },
  g: { short: { ar: "غ", fr: "g", en: "g" }, long: { ar: "بالغرام", fr: "Au gramme", en: "Per gram" }, step: 50 },
  tonne: { short: { ar: "طن", fr: "tonne", en: "tonne" }, long: { ar: "بالطن", fr: "À la tonne", en: "Per tonne" }, step: 0.5 },
  lot: { short: { ar: "دفعة", fr: "lot", en: "lot" }, long: { ar: "بالدفعة (لوط)", fr: "Par lot", en: "Per lot" }, step: 1 },
  libre: { short: { ar: "وحدة", fr: "unité", en: "unit" }, long: { ar: "كمية حرة", fr: "Quantité libre", en: "Free quantity" }, step: 1 },
};

/** Clamp a requested quantity between one step and the available stock — never above stock. */
export function clampQuantity(requested: number, stock: number, step = 1): number {
  if (!Number.isFinite(requested) || stock <= 0) return 0;
  const min = Math.min(step, stock);
  const rounded = Math.round(requested / step) * step;
  return Math.min(Math.max(rounded, min), stock);
}

/** Total price in DT, rounded to the millime (3 decimals). */
export function quantityTotal(unitPrice: number, quantity: number): number {
  return Math.round(unitPrice * quantity * 1000) / 1000;
}
