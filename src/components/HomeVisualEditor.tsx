"use client";

import { useEffect, useState } from "react";
import { Check, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const defaults = {
  badge: "Verified marketplace professionals",
  heading: "Find trusted professionals for work that matters.",
  description: "Post work, compare qualified professionals, and manage every project in one place.",
  browse: "Browse professionals",
  post: "Post a job",
  eyebrow: "Live marketplace",
  services: "Featured services",
};

export function HomeVisualEditor() {
  const [text, setText] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewVersion, setPreviewVersion] = useState(0);
  useEffect(() => {
    void fetch("/api/v1/website/page-text?path=/")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { text?: Partial<typeof defaults> } | null) => {
        if (data?.text) setText((current) => ({ ...current, ...data.text }));
      });
  }, []);
  useEffect(() => {
    window.sessionStorage.setItem("servio-home-preview", JSON.stringify(text));
  }, [text]);
  useEffect(() => {
    const receiveChange = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        (event.data?.type !== "servio-cms-text" && event.data?.type !== "servio-cms-any-text")
      )
        return;
      if (event.data?.type === "servio-cms-any-text") {
        const current = JSON.parse(
          window.sessionStorage.getItem("servio-cms-live-preview:/") ?? "{}",
        );
        current[event.data.key] = event.data.value;
        window.sessionStorage.setItem("servio-cms-live-preview:/", JSON.stringify(current));
        return;
      }
      const key = event.data.key as keyof typeof defaults;
      if (key in defaults && typeof event.data.value === "string")
        setText((current) => ({ ...current, [key]: event.data.value }));
    };
    window.addEventListener("message", receiveChange);
    return () => window.removeEventListener("message", receiveChange);
  }, []);
  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const live = JSON.parse(window.sessionStorage.getItem("servio-cms-live-preview:/") ?? "{}");
      const response = await fetch("/api/v1/admin/cms/visual", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: "/", text: { ...text, ...live } }),
      });
      const data = await response.json().catch(() => ({}));
      setMessage(
        response.ok
          ? "Homepage saved. Your changes are live."
          : (data.error ?? "Could not save the homepage."),
      );
    } catch {
      setMessage("Could not save the homepage. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  const preview = () => {
    window.sessionStorage.setItem("servio-home-preview", JSON.stringify(text));
    window.open("/?cmsPreview=1", "_blank");
  };
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#11182b] shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">Homepage — editing canvas</p>
          <p className="text-xs text-slate-400">
            Links, hire buttons, and cards are disabled here. Edit text only, preview, then upload.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setPreviewVersion((value) => value + 1)}
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh canvas
          </Button>
          <Button
            onClick={preview}
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview full page
          </Button>
          <Button
            onClick={() => void save()}
            disabled={saving}
            className="bg-indigo-500 hover:bg-indigo-400"
          >
            {saving ? (
              "Uploading…"
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Upload changes
              </>
            )}
          </Button>
        </div>
      </div>
      <iframe
        key={previewVersion}
        className="h-[calc(100vh-160px)] min-h-[760px] w-full bg-white"
        src="/?cmsPreview=1&cmsEdit=1"
        title="Complete editable homepage"
      />
      {message && <p className="px-4 py-3 text-sm text-emerald-400">{message}</p>}
    </section>
  );
}
