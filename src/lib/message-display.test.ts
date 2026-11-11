import { describe, expect, it } from "vitest";
import { displayMessageContent } from "./message-display";

describe("displayMessageContent", () => {
  it("leaves ordinary chat text unchanged", () => {
    expect(displayMessageContent("Salut, c’est encore dispo ?", "fr")).toBe("Salut, c’est encore dispo ?");
  });

  it("renders offer JSON as readable French copy", () => {
    const raw = JSON.stringify({
      __kind: "offer",
      original_price: 100,
      offered_price: 80,
      quantity: 2,
      unit: "kg",
      notes: "Urgent",
      status: "pending",
    });
    const out = displayMessageContent(raw, "fr");
    expect(out).toContain("Offre");
    expect(out).not.toContain("__kind");
    expect(out).toContain("Urgent");
  });

  it("renders notification JSON using the locale message", () => {
    const raw = JSON.stringify({
      __kind: "notification",
      title: { ar: "تنبيه", fr: "Alerte", en: "Alert" },
      message: { ar: "مرحبا", fr: "Bonjour", en: "Hello" },
    });
    expect(displayMessageContent(raw, "en")).toBe("Alert\nHello");
  });
});
