import type { Locale, Msg } from "./i18n";
import { formatDT, formatNumber } from "./format";

function pickMsg(value: unknown, locale: Locale): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const picked = o[locale] ?? o.fr ?? o.ar ?? o.en;
  return typeof picked === "string" && picked.trim() ? picked.trim() : null;
}

function statusLabel(status: string, locale: Locale): string {
  const map: Record<string, Msg> = {
    pending: { ar: "قيد الانتظار", fr: "en attente", en: "pending" },
    accepted: { ar: "مقبولة", fr: "acceptée", en: "accepted" },
    rejected: { ar: "مرفوضة", fr: "refusée", en: "rejected" },
    cancelled: { ar: "ملغاة", fr: "annulée", en: "cancelled" },
    fulfilled: { ar: "منفّذة", fr: "honorée", en: "fulfilled" },
  };
  return (map[status] ?? map.pending)[locale];
}

function unitLabel(unit: unknown, locale: Locale): string {
  if (typeof unit === "string" && unit.trim()) return unit.trim();
  if (unit && typeof unit === "object") return pickMsg(unit, locale) ?? "";
  return "";
}

/** Turn stored chat payloads (plain text or JSON fallbacks) into readable copy. */
export function displayMessageContent(raw: string | null | undefined, locale: Locale): string {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  if (!text.startsWith("{") && !text.startsWith("[")) return text;

  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return text;

    const p = parsed as Record<string, unknown>;
    const kind = typeof p.__kind === "string" ? p.__kind : "";

    if (kind === "notification") {
      const title = pickMsg(p.title, locale);
      const message = pickMsg(p.message, locale);
      return [title, message].filter(Boolean).join("\n");
    }

    if (kind === "offer") {
      const offered = Number(p.offered_price);
      const original = Number(p.original_price);
      const qty = Number(p.quantity);
      const unit = unitLabel(p.unit, locale);
      const notes = typeof p.notes === "string" ? p.notes.trim() : "";
      const status = typeof p.status === "string" ? p.status : "pending";
      const headline: Msg = {
        ar: `عرض سعر: ${formatDT(offered, locale)}${Number.isFinite(original) ? ` (السعر ${formatDT(original, locale)})` : ""}`,
        fr: `Offre : ${formatDT(offered, locale)}${Number.isFinite(original) ? ` (prix affiché ${formatDT(original, locale)})` : ""}`,
        en: `Offer: ${formatDT(offered, locale)}${Number.isFinite(original) ? ` (listed ${formatDT(original, locale)})` : ""}`,
      };
      const qtyLine =
        Number.isFinite(qty) && qty > 0
          ? ({
              ar: `الكمية: ${formatNumber(qty, locale)}${unit ? ` ${unit}` : ""}`,
              fr: `Quantité : ${formatNumber(qty, locale)}${unit ? ` ${unit}` : ""}`,
              en: `Quantity: ${formatNumber(qty, locale)}${unit ? ` ${unit}` : ""}`,
            } satisfies Msg)[locale]
          : "";
      const statusLine: Msg = {
        ar: `الحالة: ${statusLabel(status, locale)}`,
        fr: `Statut : ${statusLabel(status, locale)}`,
        en: `Status: ${statusLabel(status, locale)}`,
      };
      return [headline[locale], qtyLine, statusLine[locale], notes].filter(Boolean).join("\n");
    }

    if (kind === "quantity_request") {
      const qty = Number(p.requested_quantity);
      const unit = unitLabel(p.unit, locale);
      const total = Number(p.total_value);
      const location = typeof p.delivery_location === "string" ? p.delivery_location.trim() : "";
      const notes = typeof p.notes === "string" ? p.notes.trim() : "";
      const status = typeof p.status === "string" ? p.status : "pending";
      const headline: Msg = {
        ar: `طلب كمية: ${formatNumber(Number.isFinite(qty) ? qty : 0, locale)}${unit ? ` ${unit}` : ""}`,
        fr: `Demande de quantité : ${formatNumber(Number.isFinite(qty) ? qty : 0, locale)}${unit ? ` ${unit}` : ""}`,
        en: `Quantity request: ${formatNumber(Number.isFinite(qty) ? qty : 0, locale)}${unit ? ` ${unit}` : ""}`,
      };
      const totalLine = Number.isFinite(total)
        ? ({
            ar: `القيمة: ${formatDT(total, locale)}`,
            fr: `Valeur : ${formatDT(total, locale)}`,
            en: `Value: ${formatDT(total, locale)}`,
          } satisfies Msg)[locale]
        : "";
      const locLine = location
        ? ({
            ar: `التسليم: ${location}`,
            fr: `Livraison : ${location}`,
            en: `Delivery: ${location}`,
          } satisfies Msg)[locale]
        : "";
      const statusLine: Msg = {
        ar: `الحالة: ${statusLabel(status, locale)}`,
        fr: `Statut : ${statusLabel(status, locale)}`,
        en: `Status: ${statusLabel(status, locale)}`,
      };
      return [headline[locale], totalLine, locLine, statusLine[locale], notes].filter(Boolean).join("\n");
    }

    const asMsg = pickMsg(p, locale);
    if (asMsg && ("ar" in p || "fr" in p || "en" in p) && !kind) return asMsg;

    const nested = pickMsg(p.message, locale);
    if (nested) return nested;
  } catch {
    return text;
  }

  return text;
}
