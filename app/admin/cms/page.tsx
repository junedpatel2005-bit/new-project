"use client";

import { useCallback, useEffect, useState } from "react";
import { Blocks, ChevronDown, ExternalLink, Eye, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeVisualEditor } from "@/components/HomeVisualEditor";
import { CmsBlockBuilder } from "@/components/CmsBlockBuilder";
import { VisualPageEditor } from "@/components/VisualPageEditor";

type Page = {
  id: number;
  title: string;
  slug: string;
  content: string;
  sections?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

function normalizeCmsContent(value: string) {
  const cssEnd = value.lastIndexOf("}");
  const prefix = value.slice(0, cssEnd + 1);
  if (cssEnd < 0 || !prefix.includes("{") || !/\.cms-[\w-]+/.test(prefix)) return value;
  return value.slice(cssEnd + 1).trimStart();
}

function defaultCmsContent(page: Page | null) {
  if (page?.slug !== "terms" || page.content.trim())
    return normalizeCmsContent(page?.content ?? "");
  return [
    "<h2>Using Klick-Pro</h2>",
    "<p>Clients and professionals must provide accurate information and use the marketplace respectfully and lawfully.</p>",
    "<h2>Marketplace projects</h2>",
    "<p>Project payments, milestones, reviews, disputes, and communications should be managed through Klick-Pro where available.</p>",
  ].join("");
}

export default function CmsPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [selected, setSelected] = useState<Page | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<Page["status"]>("DRAFT");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<"canvas" | "blocks">("canvas");
  const [blocksOpen, setBlocksOpen] = useState(false);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);

  const pick = useCallback((page: Page | null, list?: Page[], keepEditorOpen = false) => {
    if (list) setPages(list);
    setSelected(page);
    setTitle(page?.title ?? "");
    setContent(defaultCmsContent(page));
    setStatus(page?.status ?? "DRAFT");
    setPreview(false);
    if (!keepEditorOpen) setEditorOpen(false);
    setEditorTab("canvas");
    setBlocksOpen(false);
    setPageMenuOpen(false);
  }, []);
  const updatePageSections = useCallback((pageId: number, sections: string) => {
    setPages((current) =>
      current.map((page) => (page.id === pageId ? { ...page, sections } : page)),
    );
    setSelected((current) => (current?.id === pageId ? { ...current, sections } : current));
  }, []);
  useEffect(() => {
    void fetch("/api/v1/admin/data/cms", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => pick(data.pages?.[0] ?? null, data.pages ?? []));
  }, [pick]);
  useEffect(() => {
    if (!editorOpen && !blocksOpen && !preview) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [blocksOpen, editorOpen, preview]);
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
  const previewUrl = `${url}${url.includes("?") ? "&" : "?"}cmsPreview=1`;
  const editablePreviewUrl = `${url}${url.includes("?") ? "&" : "?"}cmsPreview=1&cmsEdit=1`;
  const isHome = selected?.slug === "" || selected?.slug === "/";
  const isProHome = selected?.slug === "professional-home";
  const isServices = selected?.slug === "services";
  const editorLabel = isHome
    ? "Edit the client homepage layout directly. Click text in the page to change it."
    : isProHome
      ? "Edit the professional homepage layout directly. Click text in the page to change it. Job cards are live database data and cannot be edited."
      : isServices
        ? "Edit the services page header text. Job cards are live database data and cannot be edited."
        : "Edit the actual website page directly. Click highlighted text to change it, then upload your changes.";

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
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#11182b] shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-white">Page preview</p>
                <p className="mt-1 text-xs text-slate-400">
                  Review the real page, then use the pencil to edit its content.
                </p>
              </div>
              {selected && (
                <div className="flex items-center gap-2">
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-3 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                  >
                    <ExternalLink className="h-4 w-4" /> Open page
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setEditorTab("canvas");
                      setEditorOpen(true);
                    }}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-500 px-3 text-xs font-bold text-white transition hover:bg-indigo-400"
                  >
                    <Pencil className="h-4 w-4" /> Edit page
                  </button>
                </div>
              )}
            </div>
            <iframe
              className="h-[calc(100vh-285px)] min-h-[620px] w-full bg-white"
              src={selected ? previewUrl : "about:blank"}
              title="Website page preview"
            />
          </section>
        </div>
      </div>
      {editorOpen && selected && (
        <div className="fixed inset-0 z-40 bg-[#060913]/90 p-0 backdrop-blur-sm sm:p-2">
          <div className="mx-auto flex h-full max-w-none flex-col overflow-hidden rounded-none border border-white/10 bg-[#11182b] shadow-2xl sm:rounded-2xl">
            <header className="relative flex items-center justify-between border-b border-white/10 px-5 py-4 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-300">
                  Edit page
                </p>
                <div className="relative mt-1">
                  <button
                    type="button"
                    onClick={() => setPageMenuOpen((open) => !open)}
                    className="inline-flex items-center gap-2 text-lg font-bold text-white transition hover:text-indigo-200"
                  >
                    {selected.title}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {pageMenuOpen && (
                    <div className="absolute left-0 top-full z-50 mt-3 max-h-[min(28rem,70vh)] w-72 overflow-auto rounded-xl border border-white/15 bg-[#11182b] p-2 shadow-2xl">
                      {pages.map((page) => (
                        <button
                          key={page.id}
                          type="button"
                          onClick={() => pick(page, undefined, true)}
                          className={`w-full rounded-lg px-3 py-2.5 text-left transition ${
                            selected.id === page.id
                              ? "bg-indigo-500 text-white"
                              : "text-slate-300 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <span className="block truncate text-sm font-semibold">{page.title}</span>
                          <span className="mt-0.5 block truncate text-xs opacity-70">
                            /{page.slug || "home"} · {page.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div id="cms-editor-message" className="absolute left-28 top-1/2 -translate-y-1/2" />
              <div id="cms-editor-actions" className="ml-auto mr-3" />
              <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-xl border border-white/10 bg-black/10 p-1 md:flex">
                <button
                  type="button"
                  onClick={() => setEditorTab("canvas")}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    editorTab === "canvas"
                      ? "bg-indigo-500 text-white shadow-lg"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Pencil className="h-3.5 w-3.5" /> Page editor
                </button>
                <button
                  type="button"
                  onClick={() => setBlocksOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <Blocks className="h-3.5 w-3.5" /> Content blocks
                </button>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                onClick={() => {
                  setEditorOpen(false);
                  setBlocksOpen(false);
                }}
                aria-label="Close editor"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div
              className={`min-h-0 flex-1 p-4 sm:p-6 ${
                isHome || isProHome || isServices ? "overflow-hidden" : "overflow-auto"
              }`}
            >
              {isHome || isProHome || isServices ? (
                <HomeVisualEditor
                  path={isProHome ? "/professional-home" : isServices ? "/services" : "/"}
                  actionsTargetId="cms-editor-actions"
                  messageTargetId="cms-editor-message"
                />
              ) : (
                <VisualPageEditor
                  path={url}
                  title={selected.title}
                  actionsTargetId="cms-editor-actions"
                  messageTargetId="cms-editor-message"
                />
              )}
            </div>
          </div>
        </div>
      )}
      {blocksOpen && selected && (
        <div className="fixed inset-0 z-50 bg-[#060913]/90 p-0 backdrop-blur-sm sm:p-4">
          <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-none border border-white/10 bg-[#11182b] shadow-2xl sm:rounded-2xl">
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-300">
                  Content blocks
                </p>
                <h2 className="mt-1 text-lg font-bold">Build page sections</h2>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                onClick={() => setBlocksOpen(false)}
                aria-label="Close content blocks"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
              <CmsBlockBuilder
                key={selected.id}
                page={selected}
                onSaved={(sections) => updatePageSections(selected.id, sections)}
              />
            </div>
          </div>
        </div>
      )}
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
              src={editablePreviewUrl}
              title="Website page preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
