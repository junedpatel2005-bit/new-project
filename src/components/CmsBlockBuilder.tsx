"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Table2, Text, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Block = {
  id: string;
  type: "text" | "image" | "table";
  heading?: string;
  body?: string;
  imageUrl?: string;
  imageAlt?: string;
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

  const add = (type: Block["type"]) =>
    setBlocks((current) => [
      ...current,
      type === "text"
        ? { id: makeId(), type, heading: "New content block", body: "Write your content here." }
        : type === "image"
          ? {
              id: makeId(),
              type,
              heading: "Image block",
              imageUrl: "",
              imageAlt: "Image description",
            }
          : {
              id: makeId(),
              type,
              heading: "Data table",
              rows: [
                ["Column 1", "Column 2"],
                ["Value 1", "Value 2"],
              ],
            },
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
  const remove = async (index: number) => {
    const previous = blocks;
    const next = previous.filter((_, itemIndex) => itemIndex !== index);
    setBlocks(next);
    const saved = await saveBlocks(next, "Block deleted from the public page.");
    if (!saved) setBlocks(previous);
  };

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
        </div>
      </div>
      <div className="mt-5 space-y-4">
        {blocks.map((block, index) => (
          <article key={block.id} className="rounded-xl border border-white/10 bg-[#0b1020] p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Block {index + 1} · {block.type}
              </p>
              <div className="flex gap-1">
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
