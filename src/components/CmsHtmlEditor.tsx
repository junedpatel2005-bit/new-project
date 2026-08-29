"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CmsHtmlEditor({
  slug,
  path,
  title,
  onTitleChange,
  content,
  onContentChange,
  onSave,
  onPublish,
  saving,
  status,
  actionsTargetId,
  messageTargetId,
  message,
}: {
  slug: string;
  path: string;
  title: string;
  onTitleChange: (value: string) => void;
  content: string;
  onContentChange: (value: string) => void;
  onSave: () => void;
  onPublish: () => void;
  saving: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  actionsTargetId?: string;
  messageTargetId?: string;
  message?: string;
}) {
  const [previewVersion, setPreviewVersion] = useState(0);
  const [actionTarget, setActionTarget] = useState<HTMLElement | null>(null);
  const [messageTarget, setMessageTarget] = useState<HTMLElement | null>(null);
  const draftKey = `cms-draft:${slug}`;
  const hasSyncedInitial = useRef(false);

  useEffect(() => {
    if (actionsTargetId) setActionTarget(document.getElementById(actionsTargetId));
    if (messageTargetId) setMessageTarget(document.getElementById(messageTargetId));
  }, [actionsTargetId, messageTargetId]);

  useEffect(() => {
    if (hasSyncedInitial.current) return;
    hasSyncedInitial.current = true;
    window.sessionStorage.setItem(draftKey, content);
  }, [draftKey, content]);

  const updateContent = (value: string) => {
    onContentChange(value);
    window.sessionStorage.setItem(draftKey, value);
  };

  const previewUrl = `${path}?cmsPreview=1`;

  const actionBar = (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() => setPreviewVersion((value) => value + 1)}
        variant="outline"
        className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
      >
        <RefreshCw className="mr-2 h-4 w-4" /> Refresh preview
      </Button>
      <Button
        onClick={() => window.open(previewUrl, "_blank")}
        variant="outline"
        className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
      >
        <Eye className="mr-2 h-4 w-4" /> Open preview
      </Button>
      <Button onClick={onSave} disabled={saving} className="bg-indigo-500 hover:bg-indigo-400">
        <Check className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save draft"}
      </Button>
    </div>
  );

  return (
    <>
      {actionTarget && createPortal(actionBar, actionTarget)}
      {messageTarget &&
        message &&
        createPortal(
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
            {message}
          </p>,
          messageTarget,
        )}
      <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-4 lg:grid-cols-2 lg:grid-rows-1">
        <div className="flex min-h-0 flex-col gap-3 rounded-2xl border border-white/10 bg-[#11182b] p-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Page title
            <input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-[#0b1020] px-3 text-sm font-normal normal-case text-white outline-none focus:border-indigo-400"
            />
          </label>
          <label className="flex min-h-0 flex-1 flex-col text-xs font-semibold uppercase tracking-wide text-slate-400">
            Page HTML
            <textarea
              value={content}
              onChange={(event) => updateContent(event.target.value)}
              spellCheck={false}
              className="mt-1 min-h-0 flex-1 resize-none rounded-lg border border-white/15 bg-[#0b1020] p-3 font-mono text-xs font-normal normal-case leading-relaxed text-slate-200 outline-none focus:border-indigo-400"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onSave} disabled={saving} className="bg-indigo-500 hover:bg-indigo-400">
              <Check className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save draft"}
            </Button>
            <Button
              onClick={onPublish}
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              {status === "PUBLISHED" ? "Move to draft" : "Publish"}
            </Button>
            {message && !messageTarget && (
              <span className="text-xs text-emerald-400">{message}</span>
            )}
          </div>
        </div>
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#11182b]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Live preview — updates as you type
            </p>
          </div>
          <iframe
            key={previewVersion}
            className="min-h-0 w-full flex-1 bg-white"
            src={previewUrl}
            title="Page preview"
          />
        </div>
      </div>
    </>
  );
}
