"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ExternalLink, Monitor, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeVisualEditor } from "@/components/HomeVisualEditor";
import { WebsitePagePreview } from "@/components/WebsitePagePreview";
import { VisualPageEditor } from "@/components/VisualPageEditor";
import { CmsBlockBuilder } from "@/components/CmsBlockBuilder";

const CmsEditor = dynamic(() => import("@/components/CmsEditor").then((module) => module.CmsEditor), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-xl bg-white/10" />,
});

type Page = { id: number; title: string; slug: string; content: string; sections?: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED" };

export default function CmsPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [selected, setSelected] = useState<Page | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<Page["status"]>("DRAFT");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);

  function pick(page: Page | null, list = pages) {
    setPages(list); setSelected(page); setTitle(page?.title ?? ""); setContent(page?.content ?? ""); setStatus(page?.status ?? "DRAFT"); setPreview(false);
  }
  useEffect(() => { void fetch("/api/admin/data/cms", { cache: "no-store" }).then((response) => response.json()).then((data) => pick(data.pages?.[0] ?? null, data.pages ?? [])); }, []);
  async function save() {
    if (!selected) return;
    const response = await fetch(`/api/admin/cms/${selected.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, content, status }) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error ?? "Save failed.");
    setMessage("Page saved."); setPages((current) => current.map((page) => page.id === selected.id ? data.page : page)); setSelected(data.page);
  }
  const url = selected ? `/${selected.slug.replace(/^\//, "")}` : "/";
  const isHome = selected?.slug === "" || selected?.slug === "/" || selected?.title.toLowerCase().includes("home");

  return <div>
    <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-400">Admin module</p>
    <h1 className="mt-2 font-display text-3xl font-bold">Website CMS</h1>
    <p className="mt-2 text-slate-400">{isHome ? "Edit the real homepage layout directly. Click text in the page to change it." : "Edit content with CKEditor and preview the actual website page using its original CSS."}</p>
    <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border border-white/10 bg-white/[.035] p-3"><p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">Website pages</p>{pages.map((page) => <button key={page.id} onClick={() => pick(page)} className={`w-full rounded-xl px-3 py-3 text-left ${selected?.id === page.id ? "bg-indigo-500 text-white" : "text-slate-300 hover:bg-white/5"}`}><p className="truncate text-sm font-semibold">{page.title}</p><p className="mt-1 text-xs opacity-70">/{page.slug} · {page.status}</p></button>)}</aside>
      <div>{isHome ? <HomeVisualEditor /> : <VisualPageEditor path={url} title={selected?.title ?? "Website page"} />}{selected && <CmsBlockBuilder page={selected} />}</div>
    </div>
    {preview && <div className="fixed inset-0 z-50 bg-[#060913] p-4 sm:p-8"><div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-white"><header className="flex items-center justify-between bg-[#11182b] px-4 py-3 text-white"><div><p className="text-sm font-semibold">Live website preview</p><p className="text-xs text-slate-400">{url} · Original website CSS</p></div><button className="rounded-lg p-2 hover:bg-white/10" onClick={() => setPreview(false)}><X className="h-5 w-5" /></button></header><iframe className="min-h-0 w-full flex-1 bg-white" src={url} title="Website page preview" /></div></div>}
  </div>;
}
