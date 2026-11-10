import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { sendMessageToSeller, type SendMessageResult } from "@/lib/services.functions";
import { AccountRequiredDialog } from "./ActionDialogs";

interface ContactSellerDialogProps {
  listingId: string;
  listingTitle: string;
  sellerName: string;
  trigger?: React.ReactNode;
}

export function ContactSellerDialog({ listingId, listingTitle, sellerName, trigger }: ContactSellerDialogProps) {
  const { t, dir } = useI18n();
  const { user } = useAuth();
  const send = useServerFn(sendMessageToSeller);

  const [open, setOpen] = useState(false);
  const [needAccount, setNeedAccount] = useState(false);
  const [content, setContent] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const handleOpen = () => {
    if (!user) {
      setNeedAccount(true);
      return;
    }
    setOpen(true);
  };

  const handleSend = async () => {
    if (!content.trim()) {
      toast.error(t({ ar: "اكتب رسالتك.", fr: "Veuillez saisir votre message.", en: "Please enter your message." }));
      return;
    }

    setBusy(true);
    const res: SendMessageResult = await send({
      data: { listingId, content: content.trim(), phone: phone.trim() },
    }).catch(() => ({ ok: false, error: "failed" }) as const);
    setBusy(false);

    if (res.ok) {
      toast.success(t({ ar: "تم إرسال الرسالة إلى البائع بنجاح!", fr: "Message envoyé avec succès au vendeur !", en: "Message sent successfully to seller!" }), {
        description: t({
          ar: "البائع سيتلقى رسالتك في صندوق رسائله على الموقع.",
          fr: "Le vendeur recevra votre message dans son espace membre.",
          en: "The seller will receive your message in their member space.",
        }),
      });
      setContent("");
      setOpen(false);
    } else if (res.error === "self") {
      toast.error(t({ ar: "هذا إعلانك الخاص!", fr: "C'est votre propre annonce !", en: "This is your own listing!" }));
    } else if (res.error === "not_ready") {
      toast.error(t({
        ar: "المراسلة قيد التفعيل. حاول لاحقاً.",
        fr: "La messagerie est en cours d'activation. Réessayez plus tard.",
        en: "Messaging is being set up. Try again later.",
      }));
    } else {
      toast.error(t({ ar: "فشل إرسال الرسالة. حاول ثانية.", fr: "Échec de l'envoi. Réessayez.", en: "Failed to send message. Try again." }));
    }
  };

  return (
    <>
      {trigger ? (
        <span onClick={handleOpen} className="inline-block cursor-pointer">{trigger}</span>
      ) : (
        <Button variant="default" onClick={handleOpen}>
          <MessageSquare /> {t({ ar: "راسل", fr: "Contacter", en: "Contact" })}
        </Button>
      )}

      <AccountRequiredDialog open={needAccount} onClose={() => setNeedAccount(false)} reason="contacter" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={dir} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="size-5 text-rust" />
              {t({ ar: "مراسلة البائع", fr: "Contacter le vendeur", en: "Contact seller" })}
            </DialogTitle>
            <DialogDescription>
              {t({ ar: "للبائع :", fr: "Vendeur :", en: "Seller:" })} <span className="font-semibold text-foreground">{sellerName}</span> · « {listingTitle} »
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">
                {t({ ar: "رقم هاتفك (اختياري للرد السريع)", fr: "Votre téléphone (facultatif pour rappel rapide)", en: "Your phone (optional for quick reply)" })}
              </Label>
              <Input
                id="contact-phone"
                type="tel"
                placeholder="+216 00 000 000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-message">
                {t({ ar: "رسالتك", fr: "Votre message", en: "Your message" })} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="contact-message"
                rows={4}
                maxLength={2000}
                placeholder={t({
                  ar: "مثال: مرحباً، السلعة مازالت متوفرة؟ وين نجم نشوفها؟",
                  fr: "Ex. : Bonjour, l'article est-il toujours disponible ? Est-il possible de le voir ?",
                  en: "e.g. Hello, is this item still available? Can I inspect it?",
                })}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <p className="text-end text-xs text-muted-foreground" dir="ltr">{content.length}/2000</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              {t({ ar: "إلغاء", fr: "Annuler", en: "Cancel" })}
            </Button>
            <Button variant="rust" onClick={() => void handleSend()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Send />}
              {t({ ar: "إرسال الرسالة", fr: "Envoyer le message", en: "Send message" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
