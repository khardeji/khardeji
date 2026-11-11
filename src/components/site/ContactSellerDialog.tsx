import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageSquare, Send, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { sendMessageToSeller, type SendMessageResult } from "@/lib/services.functions";

interface ContactSellerDialogProps {
  listingId: string;
  listingTitle: string;
  sellerName: string;
  trigger?: React.ReactNode;
}

export function ContactSellerDialog({ listingId, listingTitle, sellerName, trigger }: ContactSellerDialogProps) {
  const { t, dir } = useI18n();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const send = useServerFn(sendMessageToSeller);

  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleSend = async () => {
    if (!content.trim()) {
      toast.error(t({ ar: "اكتب رسالتك.", fr: "Veuillez saisir votre message.", en: "Please enter your message." }));
      return;
    }

    if (!user && !phone.trim() && !email.trim()) {
      toast.error(
        t({
          ar: "الرجاء إدخال رقم هاتفك أو بريدك الإلكتروني ليتمكن البائع من الرد عليك.",
          fr: "Veuillez indiquer un numéro de téléphone ou un email pour que le vendeur puisse vous répondre.",
          en: "Please provide a phone number or email so the seller can get back to you.",
        })
      );
      return;
    }

    setBusy(true);
    const senderDefaultName = isAdmin
      ? "Administrateur"
      : user
      ? (user.email?.split("@")[0] || "Membre")
      : "Visiteur";

    const res: SendMessageResult = await send({
      data: {
        listingId,
        content: content.trim(),
        phone: phone.trim(),
        email: email.trim(),
        name: name.trim() || senderDefaultName,
      },
    }).catch((err) => {
      console.error("send message error:", err);
      return { ok: false, error: "failed" } as const;
    });
    setBusy(false);

    if (res.ok) {
      toast.success(
        t({
          ar: "تم إرسال الرسالة إلى البائع بنجاح!",
          fr: "Message envoyé avec succès au vendeur !",
          en: "Message sent successfully to seller!",
        }),
        {
          description: t({
            ar: "سيتلقى البائع رسالتك ويمكنه مراسلتك مباشرة على الموقع أو عبر الهاتف/الواتساب.",
            fr: "Le vendeur a reçu votre message et pourra vous répondre directement sur le site ou par téléphone/WhatsApp.",
            en: "The seller received your message and can reply directly on the site or via phone/WhatsApp.",
          }),
        }
      );
      setContent("");
      setName("");
      setPhone("");
      setEmail("");
      setOpen(false);
    } else if (res.error === "self") {
      toast.error(t({ ar: "هذا إعلانك الخاص!", fr: "C'est votre propre annonce !", en: "This is your own listing!" }));
    } else if (res.error === "not_found") {
      toast.error(t({ ar: "الإعلان غير موجود أو محذوف.", fr: "Annonce introuvable ou supprimée.", en: "Listing not found or removed." }));
    } else if (res.error === "not_ready") {
      toast.error(
        t({
          ar: "المراسلة قيد التفعيل. حاول لاحقاً.",
          fr: "La messagerie est en cours d'activation. Réessayez plus tard.",
          en: "Messaging is being set up. Try again later.",
        })
      );
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={dir} className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="size-5 text-rust" />
                {t({ ar: "مراسلة البائع", fr: "Contacter le vendeur", en: "Contact seller" })}
              </DialogTitle>
              {isAdmin ? (
                <Badge variant="rust" className="text-[0.65rem]">
                  {t({ ar: "مدير الموقع", fr: "Administrateur", en: "Admin" })}
                </Badge>
              ) : !user ? (
                <Badge variant="outline" className="text-[0.65rem] border-olive/40 text-olive">
                  {t({ ar: "إرسال مباشر", fr: "Sans compte requis", en: "No account required" })}
                </Badge>
              ) : null}
            </div>
            <DialogDescription>
              {t({ ar: "للبائع :", fr: "Vendeur :", en: "Seller:" })} <span className="font-semibold text-foreground">{sellerName}</span> · « {listingTitle} »
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            {!user && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="contact-name">
                    {t({ ar: "اسمك", fr: "Votre nom", en: "Your name" })}
                  </Label>
                  <Input
                    id="contact-name"
                    placeholder={t({ ar: "مثال: منصف", fr: "Ex. : Moncef", en: "e.g. Moncef" })}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-phone">
                    {t({ ar: "رقم هاتفك", fr: "Votre téléphone", en: "Your phone" })} <span className="text-destructive">*</span>
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
              </div>
            )}

            {user && (
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
            )}

            <div className="space-y-1.5">
              <Label htmlFor="contact-message">
                {t({ ar: "رسالتك", fr: "Votre message", en: "Your message" })} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="contact-message"
                rows={4}
                maxLength={2000}
                placeholder={t({
                  ar: "مثال: مرحباً، السلعة مازالت متوفرة؟ كلمني نتفاهمو.",
                  fr: "Ex. : Bonjour, l'article est-il toujours disponible ? Contactez-moi pour convenir d'un rendez-vous.",
                  en: "e.g. Hello, is this item still available? Contact me to discuss.",
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

