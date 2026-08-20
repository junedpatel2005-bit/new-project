"use client";

import { useEffect, useState } from "react";
import { MessageSquareText, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type FaqItem = {
  id?: number;
  question: string;
  answer: string;
  displayOrder: number;
  status?: string;
  category?: string | null;
};

type ContactRequestItem = {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
};

export default function AdminSupportPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [contactRequests, setContactRequests] = useState<ContactRequestItem[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = () =>
    void fetch("/api/v1/admin/data/support", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setFaqs(data.faqs ?? []);
        setContactRequests(data.contactRequests ?? []);
      });

  useEffect(() => {
    load();
  }, []);

  async function addFaq(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim() || !answer.trim()) {
      setMessage("Please add both a question and an answer.");
      return;
    }
    setSaving(true);
    const response = await fetch(
      editingId ? `/api/v1/admin/support?id=${editingId}` : "/api/v1/admin/support",
      {
        method: editingId ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          answer: answer.trim(),
          category: category.trim() || null,
          displayOrder: faqs.length,
        }),
      },
    );
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(data.error ?? "Unable to save FAQ item.");
      return;
    }
    setFaqs((current) =>
      editingId
        ? current.map((item) => (item.id === editingId ? data.faq : item))
        : [...current, data.faq],
    );
    setMessage(editingId ? "FAQ item updated." : "FAQ item added.");
    setQuestion("");
    setAnswer("");
    setCategory("");
    setEditingId(null);
  }

  function startEdit(faq: FaqItem) {
    if (!faq.id) return;
    setEditingId(faq.id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setCategory(faq.category ?? "");
    setMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setQuestion("");
    setAnswer("");
    setCategory("");
  }

  async function removeFaq(id: number) {
    const response = await fetch(`/api/v1/admin/support?id=${id}`, { method: "DELETE" });
    if (!response.ok) return setMessage("Unable to delete FAQ item.");
    setFaqs((current) => current.filter((item) => item.id !== id));
    if (editingId === id) cancelEdit();
    setMessage("FAQ item removed.");
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-400">Support</p>
      <h1 className="mt-2 font-display text-3xl font-bold">FAQ & contact requests</h1>
      <p className="mt-2 text-slate-400">
        Manage public FAQs and review incoming messages sent through the contact form.
      </p>

      <div className="mt-8 grid gap-6 xl:grid-cols-[420px_1fr]">
        <form
          onSubmit={(event) => void addFaq(event)}
          className="h-fit rounded-2xl border border-white/10 bg-white/[.035] p-5"
        >
          <div className="flex items-center gap-2">
            {editingId ? (
              <Pencil className="h-5 w-5 text-indigo-400" />
            ) : (
              <Plus className="h-5 w-5 text-indigo-400" />
            )}
            <h2 className="font-semibold">{editingId ? "Edit FAQ" : "Add FAQ"}</h2>
          </div>

          <label className="mt-5 block text-sm text-slate-300">
            Question
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="How do I update my profile?"
            />
          </label>

          <label className="mt-4 block text-sm text-slate-300">
            Answer
            <textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              rows={5}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1020] p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Write the help answer here..."
            />
          </label>

          <label className="mt-4 block text-sm text-slate-300">
            Category
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="General"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Groups items on the public FAQ page. Leave blank for "General".
            </span>
          </label>

          <div className="mt-5 flex gap-2">
            <Button disabled={saving} className="flex-1 bg-indigo-500 hover:bg-indigo-400">
              {saving ? "Saving..." : editingId ? "Save changes" : "Add FAQ item"}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="outline"
                onClick={cancelEdit}
                className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                Cancel
              </Button>
            )}
          </div>
          {message && <p className="mt-3 text-sm text-emerald-400">{message}</p>}
        </form>

        <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-indigo-400" />
              <h2 className="font-semibold">Public FAQ</h2>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
              {faqs.length} items
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {faqs.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No FAQ entries yet.</p>
            ) : (
              faqs.map((faq) => (
                <article
                  key={faq.id ?? `${faq.question}-${faq.displayOrder}`}
                  className={`rounded-xl border p-4 ${editingId === faq.id ? "border-indigo-400/40 bg-indigo-500/5" : "border-white/10 bg-[#0b1020]/60"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">{faq.question}</p>
                        <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-300">
                          {faq.category?.trim() || "General"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">{faq.answer}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(faq)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-300"
                      aria-label={`Edit FAQ ${faq.question}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => faq.id && void removeFaq(faq.id)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                      aria-label={`Delete FAQ ${faq.question}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[.035] p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-indigo-400" />
            <h2 className="font-semibold">Contact requests</h2>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
            {contactRequests.length} total
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {contactRequests.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No contact messages yet.</p>
          ) : (
            contactRequests.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-white/10 bg-[#0b1020]/60 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.email}</p>
                  </div>
                  <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-200">
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-200">{item.subject}</p>
                <p className="mt-2 text-sm text-slate-400 whitespace-pre-wrap">{item.message}</p>
                <p className="mt-3 text-[11px] text-slate-500">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
