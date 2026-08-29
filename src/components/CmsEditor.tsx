"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { AboutFeatureCard } from "@/components/AboutFeatureCard";
import { AboutHero } from "@/components/AboutHero";
import type { CmsCard, CmsContent } from "@/lib/cms-file";
import Landing from "@/routes/index";
import ProfessionalHome from "@/routes/professional-home";
import type { HomeContent, HomeFeature } from "@/lib/home-cms-file";
import MarketingVisualPage from "@/components/MarketingVisualPage";
import {
  marketingPageIds,
  type MarketingPageContent,
  type MarketingPageId,
} from "@/lib/marketing-cms-shared";

type Draft = Omit<CmsContent, "updatedAt" | "sectionOrder">;
const newId = () => `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const cmsPages = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Professional Home", href: "/professional-home" },
  ...marketingPageIds
    .filter((page) => page !== "professional-home")
    .map((page) => ({
      label:
        page === "faq"
          ? "FAQ"
          : page.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      href: `/${page}`,
    })),
];

export default function CmsEditor() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "saved" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [selectedPage, setSelectedPage] = useState("/about");
  const [pendingPage, setPendingPage] = useState<string | null>(null);
  const [textEditing, setTextEditing] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<Array<"hero" | "features">>([
    "hero",
    "features",
  ]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    void fetch("/api/admin/cms", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = (await response.json()) as CmsContent;
        setDraft({ hero: data.hero, cards: data.cards });
        setSectionOrder(data.sectionOrder ?? ["hero", "features"]);
        setStatus("saved");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Unable to load the saved About page.");
      });
  }, []);
  const update = (next: Draft) => {
    setDraft(next);
    setStatus("ready");
    setMessage("");
  };
  const updateCard = (id: string, changes: Partial<CmsCard>) =>
    draft &&
    update({
      ...draft,
      cards: draft.cards.map((card) => (card.id === id ? { ...card, ...changes } : card)),
    });
  const deleteCard = (id: string) =>
    draft &&
    draft.cards.length > 1 &&
    update({ ...draft, cards: draft.cards.filter((card) => card.id !== id) });
  const addCard = () =>
    draft &&
    update({
      ...draft,
      cards: [
        ...draft.cards,
        { id: newId(), title: "New card", description: "Add a description.", icon: "shield" },
      ],
    });
  const duplicateCard = (card: CmsCard) =>
    draft &&
    update({
      ...draft,
      cards: [...draft.cards, { ...card, id: newId(), title: `${card.title} copy` }],
    });
  const onDragEnd = (event: DragEndEvent) => {
    if (!draft || !event.over || event.active.id === event.over.id) return;
    const from = draft.cards.findIndex((card) => card.id === event.active.id);
    const to = draft.cards.findIndex((card) => card.id === event.over?.id);
    if (from >= 0 && to >= 0) update({ ...draft, cards: arrayMove(draft.cards, from, to) });
  };
  const handlePageChange = (page: string) => {
    if (!cmsPages.some((item) => item.href === page)) {
      setMessage("This page is not editable yet.");
      setStatus("error");
      return;
    }
    if (page === selectedPage) return;
    if (status === "ready") setPendingPage(page);
    else setSelectedPage(page);
  };
  async function save() {
    if (!draft) return false;
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch("/api/admin/cms", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, sectionOrder }),
      });
      if (!response.ok) throw new Error();
      setStatus("saved");
      setMessage("Changes saved successfully.");
      return true;
    } catch {
      setStatus("error");
      setMessage("Unable to save changes.");
      return false;
    }
  }
  const discardAndSwitch = async () => {
    if (!pendingPage) return;
    try {
      const response = await fetch("/api/admin/cms", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as CmsContent;
      setDraft({ hero: data.hero, cards: data.cards });
      setSectionOrder(data.sectionOrder ?? ["hero", "features"]);
      setStatus("saved");
      setMessage("");
      setSelectedPage(pendingPage);
      setPendingPage(null);
    } catch {
      setStatus("error");
      setMessage("Unable to discard the current changes.");
    }
  };

  if (selectedPage === "/") {
    return <HomeCmsEditor selectedPage={selectedPage} onPageChange={setSelectedPage} />;
  }
  if (selectedPage !== "/about") {
    return (
      <MarketingCmsEditor
        page={selectedPage.slice(1) as MarketingPageId}
        onPageChange={setSelectedPage}
      />
    );
  }
  if (status === "loading") return <p className="text-slate-400">Loading About page…</p>;
  if (!draft) return <p className="text-rose-300">{message}</p>;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-400">Visual CMS</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Edit About Us</h1>
          <p className="mt-2 text-slate-400">Edit the real public page without leaving the CMS.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={addCard}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/40 px-3 py-2 text-sm font-semibold text-indigo-300"
          >
            <Plus className="h-4 w-4" /> Add card
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={status === "saving"}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {status === "saving" ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex w-fit items-center gap-3 text-sm font-semibold text-slate-300">
          Editing page:
          <select
            value={selectedPage}
            onChange={(event) => handlePageChange(event.target.value)}
            className="rounded-xl border border-white/15 bg-white/[.06] px-3 py-2 text-white"
          >
            {cmsPages.map((page) => (
              <option key={page.href} value={page.href} className="text-slate-900">
                {page.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {status === "ready" && <p className="text-sm text-amber-300">Unsaved changes</p>}
      {message && (
        <p className={status === "error" ? "text-rose-300" : "text-emerald-300"}>{message}</p>
      )}
      {pendingPage && (
        <PageSwitchPrompt
          pageLabel={cmsPages.find((page) => page.href === pendingPage)?.label ?? "page"}
          onSave={async () => {
            if (await save()) {
              setSelectedPage(pendingPage);
              setPendingPage(null);
            }
          }}
          onDiscard={() => void discardAndSwitch()}
          onCancel={() => setPendingPage(null)}
        />
      )}
      <div className="overflow-hidden rounded-2xl bg-background text-foreground shadow-xl ring-1 ring-border">
        {textEditing && <InlineFormattingToolbar />}
        <>
          <div onFocusCapture={() => setTextEditing(true)}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToWindowEdges]}
              onDragEnd={(event) => {
                if (event.active.id === event.over?.id) return;
                const from = sectionOrder.indexOf(String(event.active.id) as "hero" | "features");
                const to = sectionOrder.indexOf(String(event.over?.id) as "hero" | "features");
                if (from >= 0 && to >= 0) {
                  setSectionOrder(arrayMove(sectionOrder, from, to));
                  setStatus("ready");
                  setMessage("");
                } else onDragEnd(event);
              }}
            >
              <SortableContext items={sectionOrder} strategy={rectSortingStrategy}>
                {sectionOrder.map((section) =>
                  section === "hero" ? (
                    <SortableSection key={section} id={section}>
                      <AboutHero
                        {...draft.hero}
                        editable
                        onChange={(field, value) =>
                          update({ ...draft, hero: { ...draft.hero, [field]: value } })
                        }
                      />
                    </SortableSection>
                  ) : (
                    <SortableSection key={section} id={section}>
                      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          modifiers={[restrictToWindowEdges]}
                          onDragEnd={onDragEnd}
                        >
                          <SortableContext
                            items={draft.cards.map((card) => card.id)}
                            strategy={rectSortingStrategy}
                          >
                            <div
                              className={`mx-auto grid w-full gap-6 ${draft.cards.length === 1 ? "max-w-md" : draft.cards.length === 2 ? "md:grid-cols-2" : draft.cards.length === 3 ? "md:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"}`}
                            >
                              {draft.cards.map((card) => (
                                <SortableVisualCard
                                  key={card.id}
                                  card={card}
                                  selected={selectedId === card.id}
                                  onSelect={() => setSelectedId(card.id)}
                                  onChange={(changes) => updateCard(card.id, changes)}
                                  onDelete={() => deleteCard(card.id)}
                                  onDuplicate={() => duplicateCard(card)}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </section>
                    </SortableSection>
                  ),
                )}
              </SortableContext>
            </DndContext>
          </div>
        </>
      </div>
    </div>
  );
}

function HomeCmsEditor({
  selectedPage,
  onPageChange,
}: {
  selectedPage: string;
  onPageChange: (page: string) => void;
}) {
  const [content, setContent] = useState<HomeContent | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [pendingPage, setPendingPage] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [textEditing, setTextEditing] = useState(false);
  useEffect(() => {
    void fetch("/api/admin/cms?page=home", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setContent((await response.json()) as HomeContent);
      })
      .catch(() => setLoadError("Unable to load the Home page. Please refresh and try again."));
  }, []);
  if (loadError) return <p className="text-rose-300">{loadError}</p>;
  if (!content) return <p className="text-slate-400">Loading Home page…</p>;
  const update = (next: HomeContent) => {
    setContent(next);
    setSaved(false);
    setDirty(true);
  };
  const updateFeature = (id: string, changes: Partial<HomeFeature>) => {
    if (!content) return;
    update({
      ...content,
      features: content.features.map((feature) =>
        feature.id === id ? { ...feature, ...changes } : feature,
      ),
    });
  };
  const deleteFeature = (id: string) => {
    if (!content || content.features.length <= 1) return;
    update({ ...content, features: content.features.filter((feature) => feature.id !== id) });
    setSelectedFeatureId(null);
  };
  const duplicateFeature = (id: string) => {
    if (!content) return;
    const index = content.features.findIndex((feature) => feature.id === id);
    if (index < 0) return;
    const source = content.features[index];
    if (!source) return;
    const duplicate = {
      ...source,
      id: `feature-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: `${source.title} copy`,
    };
    update({
      ...content,
      features: [
        ...content.features.slice(0, index + 1),
        duplicate,
        ...content.features.slice(index + 1),
      ],
    });
    setSelectedFeatureId(duplicate.id);
  };
  const requestPageChange = (page: string) => {
    if (!cmsPages.some((item) => item.href === page)) {
      setNotice("This page is not editable yet.");
      return;
    }
    setNotice("");
    if (page === selectedPage) return;
    if (dirty) setPendingPage(page);
    else onPageChange(page);
  };
  const saveHome = async () => {
    if (!content) return false;
    const response = await fetch("/api/admin/cms", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ page: "home", content }),
    });
    if (!response.ok) return false;
    setSaved(true);
    setDirty(false);
    return true;
  };
  const discardHomeAndSwitch = async () => {
    if (!pendingPage) return;
    const response = await fetch("/api/admin/cms?page=home", { cache: "no-store" });
    if (!response.ok) return;
    setContent((await response.json()) as HomeContent);
    setDirty(false);
    setSaved(false);
    onPageChange(pendingPage);
    setPendingPage(null);
  };
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-400">Visual CMS</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Edit Home</h1>
          <p className="mt-2 text-slate-400">Click visible text to edit.</p>
        </div>
        <button
          type="button"
          onClick={() => void saveHome()}
          className="rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white"
        >
          Save
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex w-fit items-center gap-3 text-sm font-semibold text-slate-300">
          Editing page:
          <select
            value={selectedPage}
            onChange={(event) => requestPageChange(event.target.value)}
            className="rounded-xl border border-white/15 bg-white/[.06] px-3 py-2 text-white"
          >
            {cmsPages.map((page) => (
              <option key={page.href} value={page.href} className="text-slate-900">
                {page.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {notice && <p className="text-sm text-amber-300">{notice}</p>}
      {saved && <p className="text-emerald-300">Changes saved successfully.</p>}
      {pendingPage && (
        <PageSwitchPrompt
          pageLabel={cmsPages.find((page) => page.href === pendingPage)?.label ?? "page"}
          onSave={async () => {
            if (await saveHome()) {
              onPageChange(pendingPage);
              setPendingPage(null);
            }
          }}
          onDiscard={() => void discardHomeAndSwitch()}
          onCancel={() => setPendingPage(null)}
        />
      )}
      {textEditing && <InlineFormattingToolbar />}
      <div className="overflow-hidden rounded-2xl bg-background text-foreground shadow-xl ring-1 ring-border">
        <div onFocusCapture={() => setTextEditing(true)}>
          <Landing
            isAuthenticated
            homeContent={content}
            cmsMode
            onHomeChange={update}
            selectedFeatureId={selectedFeatureId}
            onFeatureSelect={setSelectedFeatureId}
            onFeatureDelete={deleteFeature}
            onFeatureDuplicate={duplicateFeature}
          />
        </div>
      </div>
    </div>
  );
}

function InlineFormattingToolbar() {
  const format = (command: "bold" | "italic" | "underline") => {
    document.execCommand(command);
  };
  return (
    <div className="mb-3 flex w-fit items-center gap-1 rounded-lg border border-white/15 bg-slate-900 px-2 py-1 shadow-lg">
      <span className="mr-2 text-xs text-slate-400">Text formatting</span>
      {(["bold", "italic", "underline"] as const).map((command) => (
        <button
          key={command}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => format(command)}
          className="rounded px-2 py-1 text-sm font-semibold text-white hover:bg-white/10"
          aria-label={`Toggle ${command}`}
        >
          {command === "bold" ? "B" : command === "italic" ? "I" : "U"}
        </button>
      ))}
    </div>
  );
}

function MarketingCmsEditor({
  page,
  onPageChange,
}: {
  page: MarketingPageId;
  onPageChange: (page: string) => void;
}) {
  const [content, setContent] = useState<MarketingPageContent | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pendingPage, setPendingPage] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setContent(null);
    setError("");
    setDirty(false);
    void fetch(`/api/admin/cms?page=${page}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setContent((await response.json()) as MarketingPageContent);
      })
      .catch(() => setError("Unable to load this page."));
  }, [page]);
  if (error && !content) return <p className="text-rose-300">{error}</p>;
  if (!content) return <p className="text-slate-400">Loading page…</p>;
  const update = (next: MarketingPageContent) => {
    setContent(next);
    setDirty(true);
    setSaved(false);
  };
  const id = () => `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const deleteItem = (itemId: string) => {
    if (content.items.length > 1) {
      update({ ...content, items: content.items.filter((item) => item.id !== itemId) });
      setSelectedId(null);
    }
  };
  const duplicateItem = (itemId: string) => {
    const index = content.items.findIndex((item) => item.id === itemId);
    const source = content.items[index];
    if (index < 0 || !source) return;
    const duplicate = { ...source, id: id(), title: `${source.title} copy` };
    update({
      ...content,
      items: [...content.items.slice(0, index + 1), duplicate, ...content.items.slice(index + 1)],
    });
    setSelectedId(duplicate.id);
  };
  const save = async () => {
    const response = await fetch("/api/admin/cms", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ page, content }),
    });
    if (!response.ok) {
      setError("Unable to save changes.");
      return false;
    }
    setDirty(false);
    setSaved(true);
    setError("");
    return true;
  };
  const switchPage = (next: string) => {
    if (next === `/${page}`) return;
    if (dirty) setPendingPage(next);
    else onPageChange(next);
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-400">Visual CMS</p>
          <h1 className="mt-2 font-display text-3xl font-bold">
            Edit {cmsPages.find((item) => item.href === `/${page}`)?.label}
          </h1>
          <p className="mt-2 text-slate-400">Edit the real public page without leaving the CMS.</p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          className="rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white"
        >
          Save
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex w-fit items-center gap-3 text-sm font-semibold text-slate-300">
          Editing page:
          <select
            value={`/${page}`}
            onChange={(event) => switchPage(event.target.value)}
            className="rounded-xl border border-white/15 bg-white/[.06] px-3 py-2 text-white"
          >
            {cmsPages.map((item) => (
              <option key={item.href} value={item.href} className="text-slate-900">
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {dirty && <p className="text-sm text-amber-300">Unsaved changes</p>}
      {saved && <p className="text-sm text-emerald-300">Changes saved successfully.</p>}
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {pendingPage && (
        <PageSwitchPrompt
          pageLabel={cmsPages.find((item) => item.href === pendingPage)?.label ?? "page"}
          onSave={async () => {
            if (await save()) {
              onPageChange(pendingPage);
              setPendingPage(null);
            }
          }}
          onDiscard={() => {
            setPendingPage(null);
            onPageChange(pendingPage);
          }}
          onCancel={() => setPendingPage(null)}
        />
      )}
      <div className="overflow-hidden rounded-2xl bg-background text-foreground shadow-xl ring-1 ring-border">
        {page === "professional-home" ? (
          <ProfessionalHome cmsMode cmsContent={content} onCmsChange={update} />
        ) : (
          <MarketingVisualPage
            page={page}
            content={content}
            cmsMode
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={update}
            onDelete={deleteItem}
            onDuplicate={duplicateItem}
          />
        )}
      </div>
    </div>
  );
}

function PageSwitchPrompt({
  pageLabel,
  onSave,
  onDiscard,
  onCancel,
}: {
  pageLabel: string;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
      <p className="font-semibold">You have unsaved changes.</p>
      <p className="mt-1 text-amber-100/80">Choose what to do before switching to {pageLabel}.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onSave()}
          className="rounded-lg bg-indigo-500 px-3 py-2 font-semibold text-white"
        >
          Save and switch
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-lg border border-white/20 px-3 py-2 font-semibold text-white"
        >
          Discard and switch
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-white/80">
          Cancel
        </button>
      </div>
    </div>
  );
}

function SortableSection({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={isDragging ? "z-10 opacity-70 shadow-2xl" : ""}
    >
      {children}
    </div>
  );
}

function SortableVisualCard({
  card,
  selected,
  onSelect,
  onChange,
  onDelete,
  onDuplicate,
}: {
  card: CmsCard;
  selected: boolean;
  onSelect: () => void;
  onChange: (changes: Partial<CmsCard>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`${isDragging ? "z-10 scale-[1.02] opacity-70 shadow-2xl" : ""}`}
    >
      <AboutFeatureCard
        card={card}
        editable
        selected={selected}
        onSelect={onSelect}
        onChange={onChange}
        onDelete={onDelete}
      />
      {selected && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="mt-2 inline-flex items-center gap-1 text-xs text-primary"
        >
          <Copy className="h-3 w-3" /> Duplicate card
        </button>
      )}
    </div>
  );
}
