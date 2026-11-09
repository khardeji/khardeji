// Rules for buying an exact quantity from a listing's stock.
export type SaleUnit = "piece" | "kg" | "g" | "tonne" | "lot" | "libre";

export const UNIT_LABEL: Record<SaleUnit, { short: string; long: string; step: number }> = {
  piece: { short: "pièce", long: "À la pièce", step: 1 },
  kg: { short: "kg", long: "Au kilogramme", step: 1 },
  g: { short: "g", long: "Au gramme", step: 50 },
  tonne: { short: "tonne", long: "À la tonne", step: 0.5 },
  lot: { short: "lot", long: "Par lot", step: 1 },
  libre: { short: "unité", long: "Quantité libre", step: 1 },
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
