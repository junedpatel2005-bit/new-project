"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const clientDefaults = {
  badge: "Verified marketplace professionals",
  heading: "Find trusted professionals for work that matters.",
  description: "Post work, compare qualified professionals, and manage every project in one place.",
  browse: "Browse professionals",
  post: "Post a job",
  eyebrow: "Live marketplace",
  services: "Featured services",
  "why-eyebrow": "Why Choose Us",
  "why-heading": "Everything you need to succeed",
  "why-description":
    "A complete platform built for seamless collaboration between professionals and clients",
  "feature-1-title": "Verified Professionals",
  "feature-1-text":
    "All professionals are verified and vetted to ensure quality work and your peace of mind.",
  "feature-2-title": "Project Management",
  "feature-2-text":
    "Track progress, communicate in real-time, and manage all projects in one centralized dashboard.",
  "feature-3-title": "Expert Matching",
  "feature-3-text":
    "Get matched with professionals that best fit your project needs and budget requirements.",
  "feature-4-title": "Local & Remote",
  "feature-4-text":
    "Work with professionals near you or globally - choose what works best for your project.",
  "feature-5-title": "Easy Discovery",
  "feature-5-text":
    "Browse portfolios, reviews, and rates to find the right fit. Make data-driven decisions.",
  "feature-6-title": "Seamless Growth",
  "feature-6-text":
    "Build long-term relationships with reliable partners and scale your business together.",
};

const professionalDefaults = {
  "prof-badge": "Grow your professional business",
  "prof-heading": "Find projects that match your skills",
  "prof-description":
    "Browse available projects, bid on work, and build your reputation with satisfied clients worldwide.",
  "prof-browse": "Find Projects",
  "prof-dashboard": "My Dashboard",
  "prof-why-eyebrow": "Why Professionals Choose Us",
  "prof-why-heading": "Everything you need to grow",
  "prof-why-description":
    "Find quality projects, get paid safely, and build a reputation clients trust.",
  "prof-featured-eyebrow": "Featured",
  "prof-featured-heading": "Jobs ready for you",
  "prof-browse-all": "Browse all",
};

const servicesDefaults = {
  eyebrow: "Marketplace jobs",
  heading: "Browse client jobs",
  description: "Explore open work posted by clients and find the right service category for you.",
};

export function HomeVisualEditor({
  path = "/",
  actionsTargetId,
  messageTargetId,
}: {
  path?: string;
  actionsTargetId?: string;
  messageTargetId?: string;
}) {
  const isProHome = path === "/professional-home";
  const isServices = path === "/services";
  const defaults = isProHome
    ? professionalDefaults
    : isServices
      ? servicesDefaults
      : clientDefaults;
  const [text, setText] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewVersion, setPreviewVersion] = useState(0);
  const [actionTarget, setActionTarget] = useState<HTMLElement | null>(null);
  const [messageTarget, setMessageTarget] = useState<HTMLElement | null>(null);
  const previewKey = `servio-home-preview:${path}`;
  const liveKey = `servio-cms-live-preview:${path}`;
  useEffect(() => {
    if (!actionsTargetId) return;
    setActionTarget(document.getElementById(actionsTargetId));
  }, [actionsTargetId]);
  useEffect(() => {
    if (!messageTargetId) return;
    setMessageTarget(document.getElementById(messageTargetId));
  }, [messageTargetId]);
  useEffect(() => {
    void fetch(`/api/v1/website/page-text?path=${encodeURIComponent(path)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { text?: Record<string, string> } | null) => {
        if (!data?.text) return;
        const nonEmpty = Object.fromEntries(
          Object.entries(data.text).filter(([, value]) => value.trim().length > 0),
        );
        setText((current) => ({ ...current, ...nonEmpty }));
      });
  }, [path]);
  useEffect(() => {
    window.sessionStorage.setItem(previewKey, JSON.stringify(text));
  }, [text, previewKey]);
  useEffect(() => {
    const receiveChange = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        (event.data?.type !== "servio-cms-text" && event.data?.type !== "servio-cms-any-text")
      )
        return;
      if (event.data?.type === "servio-cms-any-text") {
        const current = JSON.parse(window.sessionStorage.getItem(liveKey) ?? "{}");
        current[event.data.key] = event.data.value;
        window.sessionStorage.setItem(liveKey, JSON.stringify(current));
        return;
      }
      const key = event.data.key as keyof typeof defaults;
      if (key in defaults && typeof event.data.value === "string")
        setText((current) => ({ ...current, [key]: event.data.value }));
    };
    window.addEventListener("message", receiveChange);
    return () => window.removeEventListener("message", receiveChange);
  }, [defaults, liveKey]);
  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const live = JSON.parse(window.sessionStorage.getItem(liveKey) ?? "{}");
      const merged: Record<string, string> = { ...text, ...live };
      const cleaned = Object.fromEntries(
        Object.entries(merged).filter(
          ([, value]) => typeof value === "string" && value.trim().length > 0,
        ),
      );
      const response = await fetch("/api/v1/admin/cms/visual", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path, text: cleaned }),
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
    window.sessionStorage.setItem(previewKey, JSON.stringify(text));
    window.open(`${path}?cmsPreview=1`, "_blank");
  };
  const actionBar = (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() => setPreviewVersion((value) => value + 1)}
        variant="outline"
        className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
      >
        <RefreshCw className="mr-2 h-4 w-4" /> Refresh canvas
      </Button>
      <Button
        onClick={preview}
        variant="outline"
        className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
      >
        <Eye className="mr-2 h-4 w-4" /> Preview full page
      </Button>
      <Button
        onClick={() => void save()}
        disabled={saving}
        className="bg-indigo-500 hover:bg-indigo-400"
      >
        <Check className="mr-2 h-4 w-4" /> {saving ? "Uploading..." : "Upload changes"}
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
      <section
        className={`overflow-hidden rounded-2xl border border-white/10 bg-[#11182b] shadow-2xl ${
          actionsTargetId ? "cms-visual-editor-actions-moved" : ""
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
          <div>
            <p className="text-sm font-semibold">
              {isProHome ? "Professional homepage" : isServices ? "Services page" : "Homepage"} —
              editing canvas
            </p>
            <p className="text-xs text-slate-400">
              Links, hire buttons, and cards are disabled here. Edit text only, preview, then
              upload. Database sections (job/pro cards) are not editable.
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
          src={`${path}?cmsPreview=1&cmsEdit=1`}
          title={`${isProHome ? "Professional homepage" : isServices ? "Services page" : "Complete editable homepage"}`}
        />
        {message && !messageTarget && (
          <p className="px-4 py-3 text-sm text-emerald-400">{message}</p>
        )}
      </section>
    </>
  );
}
