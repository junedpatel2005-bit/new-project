"use client";

import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  ChevronDown,
  ExternalLink,
  Eye,
  HandCoins,
  Home,
  HelpCircle,
  Info,
  LayoutGrid,
  ListChecks,
  Mail,
  Pencil,
  Save,
  ScrollText,
  ShieldCheck,
  Tag,
  Users2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeVisualEditor } from "@/components/HomeVisualEditor";
import { CmsHtmlEditor } from "@/components/CmsHtmlEditor";
import {
  ABOUT_DEFAULT_HTML,
  FOR_CLIENTS_DEFAULT_HTML,
  FOR_PROFESSIONALS_DEFAULT_HTML,
  HOW_IT_WORKS_DEFAULT_HTML,
  PRICING_DEFAULT_HTML,
  TERMS_DEFAULT_HTML,
  PRIVACY_DEFAULT_HTML,
} from "@/lib/cms-page-defaults";

type Page = {
  id: number;
  title: string;
  slug: string;
  content: string;
  sections?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

const HTML_EDITABLE_DEFAULTS: Record<string, string> = {
  about: ABOUT_DEFAULT_HTML,
  "for-clients": FOR_CLIENTS_DEFAULT_HTML,
  "for-professionals": FOR_PROFESSIONALS_DEFAULT_HTML,
  "how-it-works": HOW_IT_WORKS_DEFAULT_HTML,
  pricing: PRICING_DEFAULT_HTML,
  terms: TERMS_DEFAULT_HTML,
  "privacy-policy": PRIVACY_DEFAULT_HTML,
};

function defaultCmsContent(page: Page | null) {
  const existing = (page?.content ?? "").trim();
  if (existing) return existing;
  return page?.slug ? (HTML_EDITABLE_DEFAULTS[page.slug] ?? "") : "";
}

const PAGE_ICONS: Record<string, LucideIcon> = {
  "": Home,
  "professional-home": Users2,
  services: LayoutGrid,
  about: Info,
  "how-it-works": ListChecks,
  "for-clients": HandCoins,
  "for-professionals": Briefcase,
  pricing: Tag,
  faq: HelpCircle,
  contact: Mail,
  terms: ScrollText,
  "privacy-policy": ShieldCheck,
};

const PAGE_GROUPS: { label: string; slugs: string[] }[] = [
  { label: "Core", slugs: ["", "professional-home", "services"] },
  {
    label: "Marketing",
    slugs: ["about", "how-it-works", "for-clients", "for-professionals", "pricing", "faq", "contact"],
  },
  { label: "Legal", slugs: ["terms", "privacy-policy"] },
];

function groupPages(pages: Page[]) {
  const bySlug = new Map(pages.map((page) => [page.slug, page]));
  const grouped = PAGE_GROUPS.map((group) => ({
    label: group.label,
    pages: group.slugs.map((slug) => bySlug.get(slug)).filter((page): page is Page => Boolean(page)),
  })).filter((group) => group.pages.length > 0);
  const known = new Set(PAGE_GROUPS.flatMap((group) => group.slugs));
  const other = pages.filter((page) => !known.has(page.slug));
  return other.length ? [...grouped, { label: "Other", pages: other }] : grouped;
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
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const pick = useCallback((page: Page | null, list?: Page[], keepEditorOpen = false) => {
    if (list) setPages(list);
    setSelected(page);
    setTitle(page?.title ?? "");
    setContent(defaultCmsContent(page));
    setStatus(page?.status ?? "DRAFT");
    setPreview(false);
    if (!keepEditorOpen) setEditorOpen(false);
    setPageMenuOpen(false);
  }, []);
  useEffect(() => {
    void fetch("/api/v1/admin/data/cms", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => pick(data.pages?.[0] ?? null, data.pages ?? []));
  }, [pick]);
  useEffect(() => {
    if (!editorOpen && !preview) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editorOpen, preview]);
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
    setSaving(true);
    const response = await fetch(`/api/v1/admin/cms/${selected.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, content, status }),
    });
    const data = await response.json();
    setSaving(false);
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
  const isHtmlEditable = Boolean(selected && selected.slug in HTML_EDITABLE_DEFAULTS);
  const editorLabel = isHome
    ? "Edit the client homepage layout directly. Click text in the page to change it."
    : isProHome
      ? "Edit the professional homepage layout directly. Click text in the page to change it. Job cards are live database data and cannot be edited."
      : isServices
        ? "Edit the services page header text. Job cards are live database data and cannot be edited."
        : isHtmlEditable
          ? "Edit this page's HTML directly, then save a draft or publish it live."
          : "This page uses live application features and isn't editable as raw HTML.";

  const pageGroups = groupPages(pages);
  const SelectedIcon = selected ? (PAGE_ICONS[selected.slug] ?? Info) : Info;

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-5 border-b border-white/10 bg-[#0b1020]/95 px-5 py-5 shadow-xl backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
              <SelectedIcon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-400">
                Website CMS
              </p>
              <h1 className="mt-0.5 truncate font-display text-2xl font-bold sm:text-3xl">
                {selected ? selected.title : "Choose a page"}
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm text-slate-400">{editorLabel}</p>
            </div>
          </div>
          {selected && (
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                  status === "PUBLISHED"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-amber-500/15 text-amber-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${status === "PUBLISHED" ? "bg-emerald-400" : "bg-amber-400"}`}
                />
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
                onClick={() => void publish()}
                className="bg-indigo-500 text-white hover:bg-indigo-400"
              >
                {status === "PUBLISHED" ? "Move to draft" : "Publish page"}
              </Button>
              {message && <span className="text-sm text-emerald-400">{message}</span>}
            </div>
          )}
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit space-y-5 rounded-2xl border border-white/10 bg-white/[.035] p-3">
          {pageGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.pages.map((page) => {
                  const Icon = PAGE_ICONS[page.slug] ?? Info;
                  const active = selected?.id === page.id;
                  return (
                    <button
                      key={page.id}
                      onClick={() => pick(page)}
                      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        active ? "bg-indigo-500/15 text-white" : "text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition ${
                          active ? "bg-indigo-400" : "bg-transparent"
                        }`}
                      />
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                          active
                            ? "bg-indigo-500 text-white"
                            : "bg-white/5 text-slate-400 group-hover:text-slate-200"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{page.title}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs opacity-70">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              page.status === "PUBLISHED" ? "bg-emerald-400" : "bg-amber-400"
                            }`}
                          />
                          /{page.slug || "home"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
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
                    onClick={() => setEditorOpen(true)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-500 px-3 text-xs font-bold text-white transition hover:bg-indigo-400"
                  >
                    <Pencil className="h-4 w-4" /> Edit page
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 border-b border-white/5 bg-[#0b1020] px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
              <span className="ml-3 truncate rounded-md bg-white/5 px-3 py-1 text-xs text-slate-400">
                klick-pro.com{url}
              </span>
            </div>
            <iframe
              className="h-[calc(100vh-330px)] min-h-[560px] w-full bg-white"
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
              <button
                type="button"
                className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                onClick={() => setEditorOpen(false)}
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
              ) : isHtmlEditable ? (
                <CmsHtmlEditor
                  slug={selected.slug}
                  path={url}
                  title={title}
                  onTitleChange={setTitle}
                  content={content}
                  onContentChange={setContent}
                  onSave={() => void savePage()}
                  onPublish={() => void publish()}
                  saving={saving}
                  status={status}
                  actionsTargetId="cms-editor-actions"
                  messageTargetId="cms-editor-message"
                  message={message}
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-400">
                  This page uses live application features (a working form or database-backed
                  content) and can&rsquo;t be edited as raw HTML here.
                </div>
              )}
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
