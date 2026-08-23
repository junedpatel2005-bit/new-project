"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  ImagePlus,
  Link,
  Minus,
  Plus,
  Table2,
  Text,
  Trash2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Block = {
  id: string;
  type: "text" | "image" | "table" | "button" | "video" | "spacer" | "divider";
  heading?: string;
  body?: string;
  imageUrl?: string;
  imageAlt?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  videoUrl?: string;
  height?: number;
  placement?: "top" | "after-1" | "after-2" | "after-3" | "bottom" | "footer";
  rows?: string[][];
};
type Page = {
  id: number;
  title: string;
  content: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sections?: string;
};
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function CmsBlockBuilder({ page }: { page: Page }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  useEffect(() => {
    try {
      const parsed: unknown = JSON.parse(page.sections || "[]");
      setBlocks(Array.isArray(parsed) ? (parsed as Block[]) : []);
    } catch {
      setBlocks([]);
    }
    setMessage("");
  }, [page.id, page.sections]);

  const saveBlocks = async (
    nextBlocks: Block[],
    successMessage = "Blocks saved to the public page.",
  ) => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/admin/cms/${page.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: page.title,
          content: page.content,
          status: page.status,
          sections: nextBlocks,
        }),
      });
      if (!response.ok) throw new Error("Unable to save blocks");
      setMessage(successMessage);
      window.dispatchEvent(new CustomEvent("servio-cms-blocks-saved"));
      return true;
    } catch {
      setMessage("Unable to save blocks. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const add = (type: Block["type"], at?: number) =>
    setBlocks((current) => [
      ...current.slice(0, at ?? current.length),
      type === "text"
        ? {
            id: makeId(),
            type,
            placement: "footer",
            heading: "New content block",
            body: "Write your content here.",
          }
        : type === "image"
          ? {
              id: makeId(),
              type,
              placement: "footer",
              heading: "Image block",
              imageUrl: "",
              imageAlt: "Image description",
            }
          : type === "table"
            ? {
                id: makeId(),
                type,
                placement: "footer",
                heading: "Data table",
                rows: [
                  ["Column 1", "Column 2"],
                  ["Value 1", "Value 2"],
                ],
              }
            : type === "button"
              ? {
                  id: makeId(),
                  type,
                  placement: "footer",
                  heading: "Call to action",
                  buttonLabel: "Learn more",
                  buttonUrl: "/",
                }
              : type === "video"
                ? { id: makeId(), type, placement: "footer", heading: "Video", videoUrl: "" }
                : type === "spacer"
                  ? { id: makeId(), type, placement: "footer", heading: "Spacing", height: 48 }
                  : { id: makeId(), type, placement: "footer", heading: "Divider" },
      ...current.slice(at ?? current.length),
    ]);
  const update = (index: number, patch: Partial<Block>) =>
    setBlocks((current) =>
      current.map((block, itemIndex) => (itemIndex === index ? { ...block, ...patch } : block)),
    );
  const move = (index: number, direction: -1 | 1) =>
    setBlocks((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  const dropAt = (targetIndex: number) => {
    if (draggingIndex === null || draggingIndex === targetIndex) return;
    setBlocks((current) => {
      const next = [...current];
      const [dragged] = next.splice(draggingIndex, 1);
      if (!dragged) return current;
      next.splice(targetIndex, 0, dragged);
      return next;
    });
    setDraggingIndex(null);
  };
  const placeAt = (placement: NonNullable<Block["placement"]>) => {
    if (draggingIndex === null) return;
    setBlocks((current) =>
      current.map((block, index) => (index === draggingIndex ? { ...block, placement } : block)),
    );
    setDraggingIndex(null);
  };
  const remove = async (index: number) => {
    const previous = blocks;
    const next = previous.filter((_, itemIndex) => itemIndex !== index);
    setBlocks(next);
    const saved = await saveBlocks(next, "Block deleted from the public page.");
    if (!saved) setBlocks(previous);
  };
  const duplicate = (index: number) =>
    setBlocks((current) => {
      const source = current[index];
      if (!source) return current;
      const copy = { ...source, id: makeId() };
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">Content blocks</h2>
          <p className="mt-1 text-sm text-slate-400">
            Build any number of sections and arrange them in your own order.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={() => add("text")}
          >
            <Text className="mr-2 h-4 w-4" />
            Text
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={() => add("image")}
          >
            <ImagePlus className="mr-2 h-4 w-4" />
            Image
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={() => add("table")}
          >
            <Table2 className="mr-2 h-4 w-4" />
            Table
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={() => add("button")}
          >
            <Link className="mr-2 h-4 w-4" /> Button
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={() => add("video")}
          >
            <Video className="mr-2 h-4 w-4" /> Video
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={() => add("spacer")}
          >
            <Minus className="mr-2 h-4 w-4" /> Spacer
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={() => add("divider")}
          >
            Divider
          </Button>
        </div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(
          [
            ["top", "Top of page"],
            ["after-1", "After section 1"],
            ["after-2", "After section 2"],
            ["after-3", "After section 3"],
            ["bottom", "Before footer"],
            ["footer", "Footer content"],
          ] as const
        ).map(([placement, label]) => (
          <div
            key={placement}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              placeAt(placement);
            }}
            className={`rounded-xl border border-dashed px-3 py-3 text-center text-xs font-semibold transition-colors ${draggingIndex !== null ? "border-indigo-400 bg-indigo-500/10 text-indigo-200" : "border-white/15 text-slate-500"}`}
          >
            Drop here: {label}
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-4">
        {blocks.map((block, index) => (
          <article
            key={block.id}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              setDraggingIndex(index);
            }}
            onDragEnd={() => setDraggingIndex(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              dropAt(index);
            }}
            className={`rounded-xl border border-white/10 bg-[#0b1020] p-4 transition-opacity ${draggingIndex === index ? "opacity-40" : ""}`}
          >
            <div className="flex items-center justify-between">
              <GripVertical
                className="mr-auto h-5 w-5 cursor-grab text-slate-500 active:cursor-grabbing"
                aria-label="Drag to reorder block"
              />
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Block {index + 1} · {block.type}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => duplicate(index)}
                  className="rounded p-1.5 text-slate-400 hover:bg-white/10"
                  aria-label="Duplicate block"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  className="rounded p-1.5 text-slate-400 hover:bg-white/10"
                  aria-label="Move block up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  className="rounded p-1.5 text-slate-400 hover:bg-white/10"
                  aria-label="Move block down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void remove(index)}
                  className="rounded p-1.5 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                  aria-label="Delete block"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <input
              value={block.heading ?? ""}
              onChange={(event) => update(index, { heading: event.target.value })}
              className="mt-3 h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
              placeholder="Block heading"
            />
            <select
              value={block.placement ?? "footer"}
              onChange={(event) =>
                update(index, { placement: event.target.value as Block["placement"] })
              }
              className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#0b1020] px-3 text-sm text-white"
              aria-label="Block page position"
            >
              <option className="bg-[#0b1020] text-white" value="top">
                Place at top of page
              </option>
              <option className="bg-[#0b1020] text-white" value="after-1">
                After section 1
              </option>
              <option className="bg-[#0b1020] text-white" value="after-2">
                After section 2
              </option>
              <option className="bg-[#0b1020] text-white" value="after-3">
                After section 3
              </option>
              <option className="bg-[#0b1020] text-white" value="bottom">
                Before footer
              </option>
              <option className="bg-[#0b1020] text-white" value="footer">
                In footer content area
              </option>
            </select>
            {block.type === "text" && (
              <textarea
                value={block.body ?? ""}
                onChange={(event) => update(index, { body: event.target.value })}
                rows={4}
                className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white"
                placeholder="Content"
              />
            )}
            {block.type === "image" && (
              <>
                <input
                  value={block.imageUrl ?? ""}
                  onChange={(event) => update(index, { imageUrl: event.target.value })}
                  className="mt-3 h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
                  placeholder="Image URL"
                />
                <input
                  value={block.imageAlt ?? ""}
                  onChange={(event) => update(index, { imageAlt: event.target.value })}
                  className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
                  placeholder="Image description"
                />
              </>
            )}
            {block.type === "button" && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input
                  value={block.buttonLabel ?? ""}
                  onChange={(event) => update(index, { buttonLabel: event.target.value })}
                  className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
                  placeholder="Button label"
                />
                <input
                  value={block.buttonUrl ?? ""}
                  onChange={(event) => update(index, { buttonUrl: event.target.value })}
                  className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
                  placeholder="Button URL"
                />
              </div>
            )}
            {block.type === "video" && (
              <input
                value={block.videoUrl ?? ""}
                onChange={(event) => update(index, { videoUrl: event.target.value })}
                className="mt-3 h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
                placeholder="Embed URL (YouTube/Vimeo)"
              />
            )}
            {block.type === "spacer" && (
              <input
                type="number"
                min={8}
                max={800}
                value={block.height ?? 48}
                onChange={(event) => update(index, { height: Number(event.target.value) || 48 })}
                className="mt-3 h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
                placeholder="Height in pixels"
              />
            )}
            {block.type === "table" && (
              <textarea
                value={(block.rows ?? []).map((row) => row.join(" | ")).join("\n")}
                onChange={(event) =>
                  update(index, {
                    rows: event.target.value
                      .split("\n")
                      .filter(Boolean)
                      .map((row) => row.split("|").map((cell) => cell.trim())),
                  })
                }
                rows={4}
                className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white"
                placeholder="Column 1 | Column 2&#10;Value 1 | Value 2"
              />
            )}
          </article>
        ))}
        {!blocks.length && (
          <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">
            No blocks yet. Add text, images, or tables above.
          </div>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-emerald-400">{message}</p>
        <Button disabled={saving} onClick={() => void saveBlocks(blocks)}>
          <Plus className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save blocks"}
        </Button>
      </div>
    </section>
  );
}
