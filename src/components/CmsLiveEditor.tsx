"use client";

import { useEffect } from "react";

type Overrides = Record<string, string>;
const selector = "header a, header button, main h1, main h2, main h3, main p, main a, main button, footer h1, footer h2, footer h3, footer p, footer a";

export function CmsLiveEditor() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editing = params.get("cmsEdit") === "1";
    const preview = params.get("cmsPreview") === "1";
    const path = window.location.pathname;
    if (path.startsWith("/admin")) return;
    let overrides: Overrides = {};
    let timer: number | undefined;
    const elements = () => Array.from(document.querySelectorAll<HTMLElement>(selector)).filter((element) => element.children.length === 0 && Boolean(element.textContent?.trim()));
    const sync = () => {
      elements().forEach((element, index) => {
        const key = `content-${index}`;
        element.dataset.cmsKey = key;
        if (overrides[key] !== undefined && element.textContent !== overrides[key]) element.textContent = overrides[key];
        if (!editing || element.dataset.cmsBound === "true") return;
        element.dataset.cmsBound = "true";
        element.contentEditable = "true";
        element.spellcheck = true;
        element.classList.add("cms-live-editable");
        element.addEventListener("click", (event) => event.preventDefault());
        element.addEventListener("blur", () => {
          const value = element.textContent?.trim();
          if (!value) return;
          overrides[key] = value;
          window.parent.postMessage({ type: "servio-cms-any-text", path, key, value }, window.location.origin);
        });
      });
    };
    const load = async () => {
      try {
        const saved = (await (await fetch(`/api/website/page-text?path=${encodeURIComponent(path)}`)).json()).text ?? {};
        const draft = preview ? JSON.parse(window.sessionStorage.getItem(`servio-cms-live-preview:${path}`) ?? "{}") : {};
        overrides = { ...saved, ...draft };
      } catch { overrides = {}; }
      sync();
    };
    const blockActions = (event: MouseEvent) => {
      if (!editing) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      if (target?.closest("a, button, input, select, textarea, form")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    void load();
    document.addEventListener("click", blockActions, true);
    const observer = new MutationObserver(() => { window.clearTimeout(timer); timer = window.setTimeout(sync, 80); });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); document.removeEventListener("click", blockActions, true); if (timer) window.clearTimeout(timer); };
  }, []);
  return null;
}
