// Minimum negotiation rules based on the actual listed price.
// 1 DT – 1,000 DT: 5% minimum difference
// Above 1,000 DT: 1% minimum difference

export interface NegotiationRule {
  percentage: number;
  minDifference: number;
  maxAcceptableOffer: number;
}

export function getNegotiationRule(listedPrice: number): NegotiationRule {
  const price = Math.max(0, Number(listedPrice) || 0);
  const percentage = price <= 1000 ? 5 : 1;
  const minDifference = Math.round(price * (percentage / 100) * 1000) / 1000;
  const maxAcceptableOffer = Math.max(0, Math.round((price - minDifference) * 1000) / 1000);
  return { percentage, minDifference, maxAcceptableOffer };
}

export interface OfferValidationResult {
  ok: boolean;
  code?: "invalid_price" | "below_min_difference" | "zero_or_negative";
  minDifference: number;
  percentage: number;
  difference: number;
  maxAcceptableOffer: number;
  message?: {
    ar: string;
    fr: string;
    en: string;
  };
}

export function validateNegotiationOffer(listedPrice: number, offeredPrice: number): OfferValidationResult {
  const rule = getNegotiationRule(listedPrice);
  const { percentage, minDifference, maxAcceptableOffer } = rule;

  if (!Number.isFinite(offeredPrice) || offeredPrice <= 0) {
    return {
      ok: false,
      code: "zero_or_negative",
      minDifference,
      percentage,
      difference: 0,
      maxAcceptableOffer,
      message: {
        ar: "المبلغ المقترح يجب أن يكون أكبر من 0.",
        fr: "Le montant proposé doit être supérieur à 0.",
        en: "Proposed amount must be greater than 0.",
      },
    };
  }

  const diff = Math.round(Math.abs(listedPrice - offeredPrice) * 1000) / 1000;

  if (diff < minDifference) {
    return {
      ok: false,
      code: "below_min_difference",
      minDifference,
      percentage,
      difference: diff,
      maxAcceptableOffer,
      message: {
        ar: `الفرق الأدنى للتفاوض هو ${minDifference} د.ت (${percentage}%). العرض الأقصى المقبول هو ${maxAcceptableOffer} د.ت.`,
        fr: `La différence minimale de négociation est de ${minDifference} DT (${percentage}%). L'offre maximale acceptable est de ${maxAcceptableOffer} DT.`,
        en: `The minimum negotiation difference is ${minDifference} DT (${percentage}%). The maximum acceptable offer is ${maxAcceptableOffer} DT.`,
      },
    };
  }

  return {
    ok: true,
    minDifference,
    percentage,
    difference: diff,
    maxAcceptableOffer,
  };
}

