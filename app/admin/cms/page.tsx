"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Eye, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeVisualEditor } from "@/components/HomeVisualEditor";
import { CmsBlockBuilder } from "@/components/CmsBlockBuilder";

const CmsEditor = dynamic(
  () => import("@/components/CmsEditor").then((module) => module.CmsEditor),
  {
    ssr: false,
    loading: () => <div className="h-80 animate-pulse rounded-xl bg-white/10" />,
  },
);

type Page = {
  id: number;
  title: string;
  slug: string;
  content: string;
  sections?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export default function CmsPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [selected, setSelected] = useState<Page | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<Page["status"]>("DRAFT");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);

  const pick = useCallback((page: Page | null, list?: Page[]) => {
    if (list) setPages(list);
    setSelected(page);
    setTitle(page?.title ?? "");
    setContent(page?.content ?? "");
    setStatus(page?.status ?? "DRAFT");
    setPreview(false);
  }, []);
  useEffect(() => {
    void fetch("/api/v1/admin/data/cms", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => pick(data.pages?.[0] ?? null, data.pages ?? []));
  }, [pick]);
  async function publish() {
    if (!selected) return;
    const nextStatus = status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    const response = await fetch(`/api/v1/admin/cms/${selected.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, content, status: nextStatus }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error ?? "Could not update status.");
    setStatus(nextStatus);
    setMessage(nextStatus === "PUBLISHED" ? "Page published." : "Page moved to draft.");
    setPages((current) => current.map((page) => (page.id === selected.id ? data.page : page)));
    setSelected(data.page);
  }
  async function savePage() {
    if (!selected) return;
    const response = await fetch(`/api/v1/admin/cms/${selected.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, content, status }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error ?? "Could not save page.");
    setPages((current) => current.map((page) => (page.id === selected.id ? data.page : page)));
    setSelected(data.page);
    setMessage("Page changes saved.");
  }
  const url = selected ? `/${selected.slug.replace(/^\//, "")}` : "/";
  const isHome = selected?.slug === "" || selected?.slug === "/";
  const isProHome = selected?.slug === "professional-home";
  const isServices = selected?.slug === "services";
  const editorLabel = isHome
    ? "Edit the client homepage layout directly. Click text in the page to change it."
    : isProHome
      ? "Edit the professional homepage layout directly. Click text in the page to change it. Job cards are live database data and cannot be edited."
      : isServices
        ? "Edit the services page header text. Job cards are live database data and cannot be edited."
        : "Edit content with CKEditor and preview the actual website page using its original CSS.";

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-5 border-b border-white/10 bg-[#0b1020]/95 px-5 py-4 shadow-xl backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-400">
              Admin module
            </p>
            <div className="mt-2 flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold sm:text-3xl">Website CMS</h1>
              {selected && (
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">
                  Editing: {selected.title}
                </span>
              )}
            </div>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">{editorLabel}</p>
          </div>
          {selected && (
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                  status === "PUBLISHED"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-amber-500/15 text-amber-300"
                }`}
              >
                {status}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPreview(true)}
                className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Eye className="mr-2 h-4 w-4" /> Preview
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void savePage()}
                className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void publish()}
                className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                {status === "PUBLISHED" ? "Move to draft" : "Publish page"}
              </Button>
              {message && <span className="text-sm text-emerald-400">{message}</span>}
            </div>
          )}
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-white/[.035] p-3">
          <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            Website pages
          </p>
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => pick(page)}
              className={`w-full rounded-xl px-3 py-3 text-left ${selected?.id === page.id ? "bg-indigo-500 text-white" : "text-slate-300 hover:bg-white/5"}`}
            >
              <p className="truncate text-sm font-semibold">{page.title}</p>
              <p className="mt-1 text-xs opacity-70">
                /{page.slug} · {page.status}
              </p>
            </button>
          ))}
        </aside>
        <div>
          {isHome || isProHome || isServices ? (
            <HomeVisualEditor
              path={isProHome ? "/professional-home" : isServices ? "/services" : "/"}
            />
          ) : (
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#11182b] shadow-2xl">
              <div className="border-b border-white/10 px-5 py-4 text-white">
                <p className="text-sm font-semibold">Page content editor</p>
                <p className="mt-1 text-xs text-slate-400">
                  Use the full toolbar to format text, headings, links, lists, tables, and media.
                </p>
              </div>
              <div className="bg-white p-4 sm:p-6">
                <label className="mb-4 block text-sm font-semibold text-slate-700">
                  Page title
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </label>
                <CmsEditor value={content} onChange={setContent} />
              </div>
            </section>
          )}
          {selected && <CmsBlockBuilder page={selected} />}
        </div>
      </div>
      {preview && (
        <div className="fixed inset-0 z-50 bg-[#060913] p-4 sm:p-8">
          <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-white">
            <header className="flex items-center justify-between bg-[#11182b] px-4 py-3 text-white">
              <div>
                <p className="text-sm font-semibold">Live website preview</p>
                <p className="text-xs text-slate-400">{url} · Original website CSS</p>
              </div>
              <button
                className="rounded-lg p-2 hover:bg-white/10"
                onClick={() => setPreview(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <iframe
              className="min-h-0 w-full flex-1 bg-white"
              src={url}
              title="Website page preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
