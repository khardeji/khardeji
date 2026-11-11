import { useState, useRef, useEffect, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, CheckCheck, Loader2, Mail, MessageCircle, MessageSquare, Phone, Send, User } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/hooks/use-i18n";
import { markMessageRead, replyToConversation, type MessageItem } from "@/lib/services.functions";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  partnerName: string;
  partnerPhone: string;
  partnerEmail: string;
  partnerId: string | null;
  listingId: string | null;
  listingTitle: string | null;
  messages: MessageItem[];
  lastMessage: MessageItem;
  unreadCount: number;
}

export function MessengerChat({
  messages,
  onReplySent,
}: {
  messages: MessageItem[];
  onReplySent: () => void;
}) {
  const { t, date, dir } = useI18n();
  const setRead = useServerFn(markMessageRead);
  const sendReply = useServerFn(replyToConversation);

  // Group messages by conversation thread
  const conversations = useMemo(() => {
    const map = new Map<string, Conversation>();

    // Process from oldest to newest for chronological ordering inside conversation
    const sorted = [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const m of sorted) {
      // Identifier: group by listing and the other participant
      const partnerKey = m.isMine
        ? (m.recipientId || "dest")
        : (m.senderId || m.senderPhone || m.senderEmail || m.senderName || m.id);
      const threadKey = `${m.listingId || "general"}_${partnerKey}`;

      let conv = map.get(threadKey);
      if (!conv) {
        conv = {
          id: threadKey,
          partnerName: m.isMine ? "Acheteur" : (m.senderName || "Visiteur"),
          partnerPhone: m.senderPhone || "",
          partnerEmail: m.senderEmail || "",
          partnerId: m.isMine ? m.recipientId : m.senderId,
          listingId: m.listingId,
          listingTitle: m.listingTitle ? (typeof m.listingTitle === "string" ? m.listingTitle : t(m.listingTitle)) : null,
          messages: [],
          lastMessage: m,
          unreadCount: 0,
        };
        map.set(threadKey, conv);
      }

      conv.messages.push(m);
      conv.lastMessage = m;
      if (!m.isMine && m.senderPhone && !conv.partnerPhone) conv.partnerPhone = m.senderPhone;
      if (!m.isMine && m.senderEmail && !conv.partnerEmail) conv.partnerEmail = m.senderEmail;
      if (!m.isMine && m.senderName && conv.partnerName === "Acheteur") conv.partnerName = m.senderName;
      if (!m.isMine && !m.isRead) conv.unreadCount += 1;
    }

    // Return conversations sorted by newest lastMessage first
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  }, [messages, t]);

  const [activeId, setActiveId] = useState<string>(conversations[0]?.id || "");
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-select first conversation if activeId is invalid
  useEffect(() => {
    if (!activeId && conversations[0]?.id) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  const activeConv = conversations.find((c) => c.id === activeId) || conversations[0];

  // Auto scroll to bottom of chat when new message arrives or thread changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConv?.messages.length, activeId]);

  // Mark active conversation messages as read
  useEffect(() => {
    if (activeConv && activeConv.unreadCount > 0) {
      const unread = activeConv.messages.filter((m) => !m.isMine && !m.isRead);
      for (const m of unread) {
        void setRead({ data: { messageId: m.id } });
      }
    }
  }, [activeConv, setRead]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!replyText.trim() || !activeConv || busy) return;

    const content = replyText.trim();
    setBusy(true);

    const res = await sendReply({
      data: {
        listingId: activeConv.listingId || "",
        recipientId: activeConv.partnerId,
        content,
        recipientPhone: activeConv.partnerPhone,
        recipientEmail: activeConv.partnerEmail,
      },
    }).catch(() => ({ ok: false, error: "failed" }) as const);

    setBusy(false);

    if (res.ok) {
      setReplyText("");
      onReplySent();
    } else {
      toast.error(t({ ar: "فشل إرسال الرد.", fr: "Échec de l'envoi de la réponse.", en: "Failed to send reply." }));
    }
  };

  const cleanPhone = activeConv?.partnerPhone ? activeConv.partnerPhone.replace(/[^\d]/g, "") : "";
  const waPhone = cleanPhone.startsWith("216") ? cleanPhone : `216${cleanPhone}`;
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(
        `Bonjour, concernant votre message sur l'annonce Khardeji « ${activeConv?.listingTitle || ""} » :`
      )}`
    : null;

  if (conversations.length === 0) {
    return (
      <div className="surface-card p-12 text-center rounded-2xl border border-dashed border-border">
        <MessageSquare className="mx-auto size-12 text-muted-foreground/60 mb-3" />
        <h4 className="text-base font-semibold">
          {t({ ar: "لا توجد رسائل حالياً", fr: "Aucun message pour le moment", en: "No messages yet" })}
        </h4>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
          {t({
            ar: "عندما يضغط أحد المشترين على «راسل» في إعلاناتك، ستظهر محادثاتكم المباشرة هنا مثل الماسنجر.",
            fr: "Dès qu'un acheteur clique sur « Contacter », vous pourrez échanger des messages en direct ici comme sur Messenger.",
            en: "When a buyer clicks 'Contact' on your listings, your live conversation thread will appear here like Messenger.",
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
      {/* LEFT: CONVERSATIONS LIST */}
      <div className="md:col-span-4 border-b md:border-b-0 md:border-e border-border bg-muted/20 flex flex-col">
        <div className="p-3.5 border-b border-border bg-card/60 flex items-center justify-between">
          <span className="font-semibold text-sm flex items-center gap-2">
            <MessageCircle className="size-4 text-rust" />
            {t({ ar: "المحادثات", fr: "Discussions", en: "Discussions" })}
          </span>
          <Badge variant="outline" className="text-xs">
            {conversations.length}
          </Badge>
        </div>

        <div className="overflow-y-auto max-h-[480px] divide-y divide-border/60">
          {conversations.map((c) => {
            const isSelected = c.id === activeId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "w-full text-start p-3.5 transition flex items-start gap-3 hover:bg-muted/40",
                  isSelected && "bg-rust/10 border-s-4 border-rust"
                )}
              >
                <Avatar className="size-10 shrink-0 mt-0.5 border border-border">
                  <AvatarFallback className="bg-charcoal text-brass font-bold text-xs uppercase">
                    {c.partnerName.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-sm truncate text-foreground">
                      {c.partnerName}
                    </span>
                    <span className="text-[0.65rem] text-muted-foreground shrink-0">
                      {date(c.lastMessage.createdAt)}
                    </span>
                  </div>
                  {c.listingTitle && (
                    <p className="text-xs text-rust font-medium truncate mt-0.5">
                      « {c.listingTitle} »
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {c.lastMessage.isMine ? (
                      <span className="text-foreground/80 font-medium">Vous : </span>
                    ) : null}
                    {c.lastMessage.content}
                  </p>
                </div>
                {c.unreadCount > 0 && (
                  <Badge variant="destructive" className="size-5 p-0 grid place-items-center rounded-full text-[0.65rem] shrink-0">
                    {c.unreadCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: ACTIVE CHAT THREAD (MESSENGER STYLE) */}
      <div className="md:col-span-8 flex flex-col h-[520px] bg-background">
        {/* Chat Header */}
        <div className="p-3.5 border-b border-border bg-card flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="size-10 shrink-0 border border-border">
              <AvatarFallback className="bg-charcoal text-brass font-bold text-xs uppercase">
                {activeConv?.partnerName.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate flex items-center gap-2">
                {activeConv?.partnerName}
                {activeConv?.partnerPhone && (
                  <span className="text-xs text-muted-foreground font-mono font-normal">
                    ({activeConv.partnerPhone})
                  </span>
                )}
              </p>
              {activeConv?.listingTitle && (
                <p className="text-xs text-rust truncate font-medium">
                  {t({ ar: "بخصوص :", fr: "Annonce :", en: "Listing:" })} « {activeConv.listingTitle} »
                </p>
              )}
            </div>
          </div>

          {/* Quick contact shortcuts */}
          <div className="flex items-center gap-1.5 shrink-0">
            {whatsappUrl && (
              <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-3.5" /> WhatsApp
                </a>
              </Button>
            )}
            {activeConv?.partnerPhone && (
              <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-xs text-olive border-olive/30 hover:bg-olive/10">
                <a href={`tel:${activeConv.partnerPhone}`} dir="ltr">
                  <Phone className="size-3.5" /> {t({ ar: "اتصال", fr: "Appeler", en: "Call" })}
                </a>
              </Button>
            )}
            {activeConv?.partnerEmail && (
              <Button asChild size="sm" variant="ghost" className="h-8 size-8 p-0">
                <a href={`mailto:${activeConv.partnerEmail}`} title={activeConv.partnerEmail}>
                  <Mail className="size-4 text-muted-foreground" />
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Chat Bubbles Scroll Area */}
        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-muted/10">
          {activeConv?.messages.map((m) => {
            const isMe = m.isMine;
            return (
              <div
                key={m.id}
                className={cn("flex flex-col max-w-[80%] transition", isMe ? "ms-auto items-end" : "me-auto items-start")}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[0.65rem] text-muted-foreground">
                  <span>{isMe ? t({ ar: "أنت", fr: "Vous", en: "You" }) : m.senderName}</span>
                  <span>·</span>
                  <span>{date(m.createdAt)}</span>
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm shadow-sm whitespace-pre-line leading-relaxed",
                    isMe
                      ? "bg-rust text-white rounded-br-sm"
                      : "bg-card border border-border text-foreground rounded-bl-sm"
                  )}
                >
                  {m.content}
                </div>
                {isMe && (
                  <span className="text-[0.6rem] text-muted-foreground mt-0.5 flex items-center gap-0.5 px-1">
                    <CheckCheck className="size-3 text-olive" />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Chat Input Bar (Messenger Style) */}
        <form onSubmit={handleSend} className="p-3 border-t border-border bg-card flex items-center gap-2 shrink-0">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={t({
              ar: "اكتب رسالة للرد...",
              fr: "Écrivez votre message (comme sur Messenger)...",
              en: "Write a reply message...",
            })}
            disabled={busy}
            className="flex-1 h-10 rounded-full px-4 text-sm bg-muted/30 focus-visible:ring-rust"
            maxLength={2000}
          />
          <Button
            type="submit"
            variant="rust"
            size="sm"
            disabled={busy || !replyText.trim()}
            className="rounded-full size-10 p-0 shrink-0"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

