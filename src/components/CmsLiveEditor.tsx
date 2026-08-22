"use client";

import { useEffect } from "react";
import { sanitizeInlineHtml } from "@/lib/sanitizeInlineHtml";

type Overrides = Record<string, string>;
// Do not edit navigation or action controls. Their client-side role/state updates can
// legitimately change after hydration, which makes DOM mutations here unsafe.
// Database-driven sections (marked [data-db-section]) are excluded entirely — the CMS
// must never rewrite live data rendered from the database.
const dbSectionExclude = ":not([data-db-section] *)";

// `app/loading.tsx` wraps every route in a Suspense boundary, so route content (e.g. a
// below-the-fold footer) can stream in and hydrate on its own schedule, independent of
// CmsLiveEditor's own hydration in the root layout. A macrotask (setTimeout(fn, 0)) only
// waits for the *root* commit, not for that streamed-in content to finish hydrating, so it
// isn't a safe signal to start mutating the DOM. requestIdleCallback waits until the browser
// has no pending work — including any in-flight hydration — which is what we actually need.
const scheduleIdle: (callback: () => void) => number =
  typeof window !== "undefined" && "requestIdleCallback" in window
    ? (callback) => window.requestIdleCallback(callback, { timeout: 500 })
    : (callback) => window.setTimeout(callback, 50);
const cancelIdle: (handle: number | undefined) => void =
  typeof window !== "undefined" && "cancelIdleCallback" in window
    ? (handle) => handle !== undefined && window.cancelIdleCallback(handle)
    : (handle) => window.clearTimeout(handle);
const selector = [
  "main h1",
  "main h2",
  "main h3",
  "main p",
  "footer h1",
  "footer h2",
  "footer h3",
  "footer p",
  'main [data-cms-editable="true"]',
]
  .map((part) => `${part}${dbSectionExclude}`)
  .join(", ");

const FORMAT_COMMANDS = [
  { command: "bold", label: "B", title: "Bold" },
  { command: "italic", label: "I", title: "Italic" },
  { command: "underline", label: "U", title: "Underline" },
] as const;

function createFormatToolbar() {
  const toolbar = document.createElement("div");
  toolbar.className = "cms-format-toolbar";
  toolbar.style.display = "none";
  const buttons = FORMAT_COMMANDS.map(({ command, label, title }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.title = title;
    button.className = `cms-format-btn cms-format-btn-${command}`;
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      document.execCommand(command);
      updateActiveStates();
    });
    toolbar.appendChild(button);
    return { command, button };
  });
  const updateActiveStates = () => {
    buttons.forEach(({ command, button }) => {
      try {
        button.classList.toggle("active", document.queryCommandState(command));
      } catch {
        // ignore unsupported command state queries
      }
    });
  };
  document.body.appendChild(toolbar);
  return { toolbar, updateActiveStates };
}

export function CmsLiveEditor() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editing = params.get("cmsEdit") === "1";
    const preview = params.get("cmsPreview") === "1";
    // The editor mutates rendered DOM to add editable metadata. Keep it completely
    // dormant on normal pages so those mutations cannot race React hydration.
    if (!editing && !preview) return;
    const path = window.location.pathname;
    if (path.startsWith("/admin")) return;
    let overrides: Overrides = {};
    let timer: number | undefined;
    const elements = () =>
      Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(
        (element) =>
          element.dataset.cmsBound === "true" ||
          (element.children.length === 0 && Boolean(element.textContent?.trim())),
      );
    const markDbSections = () => {
      if (!editing) return;
      document.querySelectorAll<HTMLElement>("[data-db-section]").forEach((section) => {
        section.classList.add("cms-db-section");
        if (section.dataset.cmsDbBanner === "true") return;
        section.dataset.cmsDbBanner = "true";
        section.style.position = "relative";
        const banner = document.createElement("div");
        banner.className = "cms-db-section-banner";
        banner.textContent = "Database section — live data, not editable";
        section.prepend(banner);
      });
    };
    const sync = () => {
      markDbSections();
      elements().forEach((element, index) => {
        const key = `content-${index}`;
        element.dataset.cmsKey = key;
        if (overrides[key] !== undefined && element.innerHTML !== overrides[key])
          element.innerHTML = sanitizeInlineHtml(overrides[key]);
        if (!editing || element.dataset.cmsBound === "true") return;
        element.dataset.cmsBound = "true";
        element.contentEditable = "true";
        element.spellcheck = true;
        element.classList.add("cms-live-editable");
        element.addEventListener("click", (event) => event.preventDefault());
        element.addEventListener("blur", () => {
          const value = sanitizeInlineHtml(element.innerHTML);
          if (!element.textContent?.trim()) return;
          overrides[key] = value;
          window.parent.postMessage(
            { type: "servio-cms-any-text", path, key, value },
            window.location.origin,
          );
        });
      });
    };
    const load = async () => {
      try {
        const saved =
          (await (await fetch(`/api/v1/website/page-text?path=${encodeURIComponent(path)}`)).json())
            .text ?? {};
        const draft = preview
          ? JSON.parse(window.sessionStorage.getItem(`servio-cms-live-preview:${path}`) ?? "{}")
          : {};
        overrides = { ...saved, ...draft };
      } catch {
        overrides = {};
      }
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
    document.addEventListener("click", blockActions, true);
    const observer = new MutationObserver(() => {
      cancelIdle(timer);
      timer = scheduleIdle(sync);
    });
    // Wait for browser idle time — not just the next macrotask — before touching the DOM.
    // React finishing its *own* hydration commit doesn't mean route content has hydrated too:
    // `app/loading.tsx` streams the route tree in via its own Suspense boundary, so a
    // below-the-fold footer can still be mid-hydration well after this component's effect
    // fires. Mutating it earlier races that and trips a hydration-mismatch error.
    //
    // requestIdleCallback alone isn't enough, though: it only tracks CPU idleness, not
    // network activity. A segment with async server work (e.g. /earnings' verifySession)
    // keeps streaming in over the *same* response after the shell has already mounted and
    // gone idle, so rIC can fire — and sync() can stamp data-cms-key onto that segment's
    // DOM — before React has hydrated content that hasn't even finished arriving yet.
    // The `load` event only fires once the whole streamed document is in, so gate the
    // first scan on it (falling back to immediate scheduling for client-side navigations,
    // where `load` already fired long ago and there's no further response to wait on).
    let startTimer: number | undefined;
    const beginSync = () => {
      startTimer = scheduleIdle(() => {
        void load();
        observer.observe(document.body, { childList: true, subtree: true });
      });
    };
    if (document.readyState === "complete") {
      beginSync();
    } else {
      window.addEventListener("load", beginSync, { once: true });
    }

    let removeToolbarListeners: (() => void) | undefined;
    if (editing) {
      const { toolbar, updateActiveStates } = createFormatToolbar();
      const hide = () => {
        toolbar.style.display = "none";
      };
      const showAt = (rect: DOMRect) => {
        toolbar.style.display = "flex";
        toolbar.style.top = `${window.scrollY + rect.top - toolbar.offsetHeight - 8}px`;
        toolbar.style.left = `${window.scrollX + rect.left + rect.width / 2 - toolbar.offsetWidth / 2}px`;
        updateActiveStates();
      };
      const onSelectionChange = () => {
        const selection = document.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) return hide();
        const anchor = selection.anchorNode;
        const anchorElement = anchor instanceof Element ? anchor : anchor?.parentElement;
        if (!anchorElement?.closest('[contenteditable="true"]')) return hide();
        showAt(selection.getRangeAt(0).getBoundingClientRect());
      };
      document.addEventListener("selectionchange", onSelectionChange);
      removeToolbarListeners = () => {
        document.removeEventListener("selectionchange", onSelectionChange);
        toolbar.remove();
      };
    }

    return () => {
      window.removeEventListener("load", beginSync);
      cancelIdle(startTimer);
      observer.disconnect();
      document.removeEventListener("click", blockActions, true);
      cancelIdle(timer);
      removeToolbarListeners?.();
    };
  }, []);
  return null;
}
