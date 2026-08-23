"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
  rows?: string[][];
};
export function PublicCmsBlocks() {
  const path = usePathname();
  const [blocks, setBlocks] = useState<Block[]>([]);
  useEffect(() => {
    if (path.startsWith("/admin")) {
      setBlocks([]);
      return;
    }
    void fetch(`/api/v1/website/blocks?path=${encodeURIComponent(path)}`)
      .then((r) => r.json())
      .then((d) => setBlocks(Array.isArray(d.blocks) ? d.blocks : []))
      .catch(() => setBlocks([]));
  }, [path]);
  if (!blocks.length) return null;
  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-16 sm:px-6 lg:px-8">
        {blocks.map((block) => (
          <article
            key={block.id}
            className="rounded-2xl border border-border bg-card p-6 shadow-soft"
          >
            {block.heading && <h2 className="font-display text-2xl font-bold">{block.heading}</h2>}
            {block.type === "text" && (
              <p className="mt-3 whitespace-pre-wrap leading-7 text-muted-foreground">
                {block.body}
              </p>
            )}
            {block.type === "image" && block.imageUrl && (
              <img
                src={block.imageUrl}
                alt={block.imageAlt ?? block.heading ?? "Content image"}
                className="mt-5 max-h-[520px] w-full rounded-xl object-cover"
              />
            )}
            {block.type === "table" && (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {(block.rows ?? []).map((row, index) => (
                      <tr key={index} className="border-b border-border">
                        {row.map((cell, column) => (
                          <td
                            key={column}
                            className={`p-3 ${index === 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {block.type === "button" && block.buttonLabel && block.buttonUrl && (
              <a
                href={block.buttonUrl}
                className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-soft transition hover:opacity-90"
              >
                {block.buttonLabel}
              </a>
            )}
            {block.type === "video" && block.videoUrl && (
              <div className="mt-5 aspect-video overflow-hidden rounded-xl bg-muted">
                <iframe
                  src={block.videoUrl}
                  title={block.heading ?? "Video"}
                  className="h-full w-full"
                  loading="lazy"
                  allowFullScreen
                />
              </div>
            )}
            {block.type === "spacer" && (
              <div aria-hidden="true" style={{ height: `${block.height ?? 48}px` }} />
            )}
            {block.type === "divider" && <hr className="mt-5 border-border" />}
          </article>
        ))}
      </div>
    </section>
  );
}
