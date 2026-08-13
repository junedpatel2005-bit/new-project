"use client";

import { useEffect, useState } from "react";
import { Check, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VisualPageEditor({ path, title }: { path: string; title: string }) {
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "servio-cms-any-text" || event.data?.path !== path) return;
      setChanges((current) => {
        const next = { ...current, [event.data.key]: event.data.value };
        window.sessionStorage.setItem(`servio-cms-live-preview:${path}`, JSON.stringify(next));
        return next;
      });
    };
    window.sessionStorage.removeItem(`servio-cms-live-preview:${path}`);
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [path]);
  const save = async () => { setSaving(true); setMessage(""); const response = await fetch("/api/admin/cms/visual", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ path, text: changes }) }); setSaving(false); setMessage(response.ok ? "Changes uploaded to the public page." : "Could not upload changes."); };
  const preview = () => { window.sessionStorage.setItem(`servio-cms-live-preview:${path}`, JSON.stringify(changes)); window.open(`${path}?cmsPreview=1`, "_blank"); };
  return <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#11182b] shadow-2xl"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white"><div><p className="text-sm font-semibold">{title} — editing canvas</p><p className="text-xs text-slate-400">Click highlighted text to edit. Links and actions are disabled in CMS.</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => setVersion((value) => value + 1)} variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"><RefreshCw className="mr-2 h-4 w-4" />Refresh canvas</Button><Button onClick={preview} variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"><Eye className="mr-2 h-4 w-4" />Preview full page</Button><Button onClick={() => void save()} disabled={saving} className="bg-indigo-500 hover:bg-indigo-400">{saving ? "Uploading…" : <><Check className="mr-2 h-4 w-4" />Upload changes</>}</Button></div></div><iframe key={version} className="h-[calc(100vh-160px)] min-h-[760px] w-full bg-white" src={`${path}?cmsPreview=1&cmsEdit=1`} title={`${title} editable website page`} />{message && <p className="px-4 py-3 text-sm text-emerald-400">{message}</p>}</section>;
}
