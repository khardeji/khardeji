// Rules for reporting a listing. Shared by the report form and the server function;
// the database repeats them as CHECK constraints (see khardeji-favoris-signalements.sql).
import type { Msg } from "./i18n";

export const REPORT_REASONS = ["fraud", "wrong_info", "sold", "prohibited", "duplicate", "offensive", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_DETAILS_MAX = 1000;
/** "Other" must be explained in a few words so the moderators know what is wrong. */
export const REPORT_OTHER_MIN = 5;

export const REPORT_REASON_LABEL: Record<ReportReason, Msg> = {
  fraud: { ar: "تحيّل ولا إعلان مزيّف", fr: "Arnaque ou fausse annonce", en: "Scam or fake listing" },
  wrong_info: { ar: "السوم ولا الوصف غالط", fr: "Prix ou description incorrects", en: "Wrong price or description" },
  sold: { ar: "تباع ولا ما عادش موجود", fr: "Déjà vendu ou indisponible", en: "Already sold or unavailable" },
  prohibited: { ar: "سلعة ممنوعة ولا مسروقة", fr: "Article interdit ou volé", en: "Prohibited or stolen item" },
  duplicate: { ar: "إعلان معاود", fr: "Annonce en double", en: "Duplicate listing" },
  offensive: { ar: "كلام ولا تصاور ما يليقوش", fr: "Contenu choquant ou insultant", en: "Offensive content" },
  other: { ar: "سبب آخر", fr: "Autre raison", en: "Other reason" },
};

export type ReportProblem = "reason" | "details_required" | "details_too_long";

export function reportProblem(input: { reason: string; details: string }): ReportProblem | null {
  if (!(REPORT_REASONS as readonly string[]).includes(input.reason)) return "reason";
  const details = input.details.trim();
  if (details.length > REPORT_DETAILS_MAX) return "details_too_long";
  if (input.reason === "other" && details.length < REPORT_OTHER_MIN) return "details_required";
  return null;
}
