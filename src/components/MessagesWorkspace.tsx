"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { MessageCircle, Send, Search, ShieldCheck } from "lucide-react";

type Contact = {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: "CLIENT" | "PROFESSIONAL";
  conversationId: string | null;
  lastMessage: { body: string; createdAt: string } | null;
  unreadCount: number;
};
type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: number;
  receiverId: number;
  body: string;
  createdAt: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function MessagesWorkspace({ admin = false }: { admin?: boolean }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [adminTab, setAdminTab] = useState<"CLIENT" | "PROFESSIONAL">("CLIENT");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [myUserId, setMyUserId] = useState<number | null>(null);

  const loadContacts = async () => {
    const response = await fetch("/api/v1/messages", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load messages.");
    const data = (await response.json()) as { contacts: Contact[] };
    setContacts(data.contacts);
    setSelectedId((current) => current ?? data.contacts[0]?.id ?? null);
  };

  useEffect(() => {
    void Promise.all([
      loadContacts(),
      fetch("/api/v1/auth/me")
        .then((response) => response.json())
        .then((data: { user?: { id?: number | string } }) =>
          setMyUserId(data.user?.id ? Number(data.user.id) : null),
        ),
    ])
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Unable to load messages."),
      )
      .finally(() => setLoading(false));
    const socket = io({ path: "/api/realtime", withCredentials: true });
    socket.on("message:new", (message: ChatMessage) => {
      setMessages((current) =>
        current.some((item) => item.id === message.id) ? current : [...current, message],
      );
      void loadContacts().catch(() => undefined);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const visibleContacts = useMemo(
    () =>
      contacts.filter(
        (contact) =>
          (!admin || contact.role === adminTab) &&
          contact.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [admin, adminTab, contacts, search],
  );
  const selected = contacts.find((contact) => contact.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected?.conversationId) {
      setMessages([]);
      return;
    }
    void fetch(`/api/v1/messages?conversationId=${encodeURIComponent(selected.conversationId)}`)
      .then((response) => response.json())
      .then((data: { conversation?: { messages?: ChatMessage[] } }) =>
        setMessages(data.conversation?.messages ?? []),
      )
      .catch(() => setError("Unable to open this conversation."));
    void fetch("/api/v1/messages", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId: selected.conversationId }),
    }).then(() => window.dispatchEvent(new CustomEvent("servio:message-read")));
  }, [selected?.conversationId]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!selected || !text.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipientId: selected.id, text }),
      });
      const data = (await response.json()) as { message?: ChatMessage; error?: string };
      if (!response.ok || !data.message)
        throw new Error(data.error ?? "Message could not be sent.");
      setMessages((current) =>
        current.some((item) => item.id === data.message?.id)
          ? current
          : [...current, data.message!],
      );
      setText("");
      await loadContacts();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="border-b border-border p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Messages</p>
            <h1 className="mt-1 font-display text-2xl font-bold">Stay connected</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {admin
                ? "Review and reply to client and professional conversations."
                : "Chat with people connected to your running projects."}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
            <span className="h-2 w-2 rounded-full bg-success" /> Live chat
          </div>
        </div>
        {admin && (
          <div className="mt-5 flex gap-2 rounded-xl bg-muted p-1">
            {(["CLIENT", "PROFESSIONAL"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setAdminTab(tab)}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${adminTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {tab === "CLIENT" ? "Clients" : "Professionals"}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="grid min-h-[620px] lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-border lg:border-b-0 lg:border-r">
          <div className="border-b border-border p-4">
            <label className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
                placeholder="Search people"
              />
            </label>
          </div>
          <div className="max-h-[520px] overflow-y-auto p-2">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading contacts…</p>
            ) : visibleContacts.length ? (
              visibleContacts.map((contact) => (
                <button
                  type="button"
                  key={contact.id}
                  onClick={() => setSelectedId(contact.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${selectedId === contact.id ? "bg-primary/10" : "hover:bg-muted"}`}
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/15 font-semibold text-primary">
                    {contact.avatarUrl ? (
                      <img
                        src={contact.avatarUrl}
                        alt=""
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      initials(contact.name)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{contact.name}</p>
                      <div className="flex items-center gap-2">
                        {contact.lastMessage && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(contact.lastMessage.createdAt).toLocaleDateString()}
                          </span>
                        )}
                        {contact.unreadCount > 0 && (
                          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                            {contact.unreadCount > 99 ? "99+" : contact.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {contact.lastMessage?.body ?? "Start a conversation"}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <p className="p-4 text-sm text-muted-foreground">No eligible conversations yet.</p>
            )}
          </div>
        </aside>
        <div className="flex min-h-[620px] flex-col">
          {selected ? (
            <>
              <header className="flex items-center gap-3 border-b border-border p-4">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/15 font-semibold text-primary">
                  {initials(selected.name)}
                </div>
                <div>
                  <p className="font-semibold">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.role === "PROFESSIONAL" ? "Professional" : "Client"}
                  </p>
                </div>
                {admin && <ShieldCheck className="ml-auto h-5 w-5 text-primary" />}
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4 sm:p-6">
                {messages.length ? (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === myUserId ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${message.senderId === myUserId ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card"}`}
                      >
                        <p className="whitespace-pre-wrap">{message.body}</p>
                        <p
                          className={`mt-1 text-[10px] ${message.senderId === myUserId ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                        >
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
                    <MessageCircle className="mx-auto mb-3 h-10 w-10 text-primary/50" />
                    No messages yet. Start the conversation.
                  </div>
                )}
              </div>
              <form onSubmit={send} className="flex gap-2 border-t border-border p-4">
                <input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Type a message…"
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center text-muted-foreground">
              <MessageCircle className="mx-auto mb-3 h-12 w-12 text-primary/50" />
              Select a person to start chatting.
            </div>
          )}
          {error && (
            <p className="border-t border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
