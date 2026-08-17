"use client";

import { useEffect } from "react";
import { sanitizeInlineHtml } from "@/lib/sanitizeInlineHtml";

type Overrides = Record<string, string>;
// Do not edit navigation or action controls. Their client-side role/state updates can
// legitimately change after hydration, which makes DOM mutations here unsafe.
// Database-driven sections (marked [data-db-section]) are excluded entirely — the CMS
// must never rewrite live data rendered from the database.
const dbSectionExclude = ":not([data-db-section] *)";
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
      window.clearTimeout(timer);
      timer = window.setTimeout(sync, 80);
    });
    // Defer the first DOM mutation past the current macrotask so React finishes hydrating
    // the whole page first — mutating SSR'd nodes any earlier can race React 19's streaming/
    // selective hydration (e.g. a below-the-fold footer still hydrating) and trigger a
    // hydration-mismatch error.
    const startTimer = window.setTimeout(() => {
      void load();
      observer.observe(document.body, { childList: true, subtree: true });
    }, 0);

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
      window.clearTimeout(startTimer);
      observer.disconnect();
      document.removeEventListener("click", blockActions, true);
      if (timer) window.clearTimeout(timer);
      removeToolbarListeners?.();
    };
  }, []);
  return null;
}
