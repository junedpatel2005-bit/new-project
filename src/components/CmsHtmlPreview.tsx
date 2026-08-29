"use client";

import { useEffect, useState } from "react";

export function CmsHtmlPreview({ slug, initialHtml }: { slug: string; initialHtml: string }) {
  const [html, setHtml] = useState(initialHtml);

  useEffect(() => {
    const key = `cms-draft:${slug}`;
    const read = () => {
      const stored = window.sessionStorage.getItem(key);
      setHtml(stored !== null ? stored : initialHtml);
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, [slug, initialHtml]);

  return <div className="cms-html-page" dangerouslySetInnerHTML={{ __html: html }} />;
}
