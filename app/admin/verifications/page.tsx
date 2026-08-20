"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type DocumentKey =
  "governmentIdUrl" | "licenseUrl" | "certificationsJson" | "insuranceUrl" | "selfieUrl";
type Verification = {
  userId: number;
  status: "PENDING" | "REJECTED";
  updatedAt: string;
  governmentIdUrl: string | null;
  licenseUrl: string | null;
  certificationsJson: string | null;
  insuranceUrl: string | null;
  selfieUrl: string | null;
  reviews: { documentKey: DocumentKey; status: "APPROVED" | "REJECTED" }[];
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    professionalCategory: string | null;
  };
};
type PersonaVerification = {
  userId: number;
  provider: string;
  providerInquiryId: string;
  providerStatus: string;
  adminStatus: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  user: Verification["user"];
};
const docs = (item: Verification) => [
  { key: "governmentIdUrl" as const, label: "Government ID", value: item.governmentIdUrl },
  { key: "licenseUrl" as const, label: "Professional license", value: item.licenseUrl },
  { key: "certificationsJson" as const, label: "Certificates", value: item.certificationsJson },
  { key: "insuranceUrl" as const, label: "Insurance", value: item.insuranceUrl },
  { key: "selfieUrl" as const, label: "Selfie verification", value: item.selfieUrl },
];

export default function AdminVerificationsPage() {
  const [items, setItems] = useState<Verification[]>([]);
  const [personaItems, setPersonaItems] = useState<PersonaVerification[]>([]);
  const [selected, setSelected] = useState<Verification | null>(null);
  const [document, setDocument] = useState<{ label: string; value: string; owner: string } | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [confirmOverall, setConfirmOverall] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [confirmDoc, setConfirmDoc] = useState<{
    key: DocumentKey;
    label: string;
    status: "APPROVED" | "REJECTED";
  } | null>(null);
  const load = () =>
    void fetch("/api/v1/admin/verifications", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.text();
        if (!response.ok) throw new Error(body || "Unable to load verification requests.");
        try {
          return JSON.parse(body) as {
            verifications?: Verification[];
            personaVerifications?: PersonaVerification[];
          };
        } catch {
          throw new Error("Verification service returned an invalid response.");
        }
      })
      .then((data) => {
        setItems(data.verifications ?? []);
        setPersonaItems(data.personaVerifications ?? []);
      })
      .catch(() => {
        setItems([]);
        setMessage("Verification records are temporarily unavailable. Please refresh.");
      });
  useEffect(load, []);
  const decide = async (status: "APPROVED" | "REJECTED") => {
    if (!selected) return;
    const response = await fetch("/api/v1/admin/verifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: selected.userId, status }),
    });
    if (!response.ok) return setMessage("Could not update verification.");
    setItems((current) => current.filter((item) => item.userId !== selected.userId));
    setSelected(null);
    setMessage(`${selected.user.firstName}'s verification was ${status.toLowerCase()}.`);
  };
  const decidePersona = async (item: PersonaVerification, status: "APPROVED" | "REJECTED") => {
    const response = await fetch("/api/v1/admin/verifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: item.userId,
        providerInquiryId: item.providerInquiryId,
        status,
      }),
    });
    if (!response.ok) return setMessage("Could not update Persona verification.");
    setPersonaItems((current) =>
      current.filter((entry) => entry.providerInquiryId !== item.providerInquiryId),
    );
    setMessage(`${item.user.firstName}'s Persona verification was ${status.toLowerCase()}.`);
  };
  const decideDocument = async (key: DocumentKey, status: "APPROVED" | "REJECTED") => {
    if (!selected) return;
    const response = await fetch("/api/v1/admin/verifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: selected.userId, documentKey: key, status }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage("Could not update document.");
    setSelected((current) =>
      current
        ? {
            ...current,
            reviews: [
              ...current.reviews.filter((review) => review.documentKey !== key),
              data.review,
            ],
          }
        : current,
    );
    setItems((current) =>
      current.map((item) =>
        item.userId === selected.userId
          ? {
              ...item,
              reviews: [
                ...item.reviews.filter((review) => review.documentKey !== key),
                data.review,
              ],
            }
          : item,
      ),
    );
  };
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-400">Trust & safety</p>
      <h1 className="mt-2 font-display text-3xl font-bold">Verification review</h1>
      <p className="mt-2 text-slate-400">
        Open a professional card to review every submitted document before making a decision.
      </p>
      {message && (
        <p className="mt-5 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {message}
        </p>
      )}
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const submitted = docs(item).filter((document) => document.value).length;
          return (
            <button
              key={item.userId}
              onClick={() => setSelected(item)}
              className="group rounded-2xl border border-white/10 bg-white/[.035] p-5 text-left transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-white/[.06]"
            >
              <div className="flex items-start justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300">
                  <UserRound className="h-5 w-5" />
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "PENDING" ? "bg-amber-400/10 text-amber-300" : "bg-rose-400/10 text-rose-300"}`}
                >
                  {item.status}
                </span>
              </div>
              <h2 className="mt-5 font-semibold text-white">
                {item.user.firstName} {item.user.lastName}
              </h2>
              <p className="mt-1 truncate text-sm text-slate-400">{item.user.email}</p>
              <p className="mt-2 text-xs text-indigo-300">
                {item.user.professionalCategory ?? "Professional"}
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
                <span className="inline-flex items-center gap-2 text-slate-300">
                  <FileText className="h-4 w-4 text-indigo-400" />
                  {submitted}/5 documents
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" />
              </div>
            </button>
          );
        })}
      </div>
      {personaItems.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold text-white">
            Persona document verification
          </h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/[.04] text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Provider</th>
                  <th className="p-4">Persona Inquiry ID</th>
                  <th className="p-4">Persona Status</th>
                  <th className="p-4">Admin Status</th>
                  <th className="p-4">Submitted At</th>
                  <th className="p-4">Reviewed At</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {personaItems.map((item) => (
                  <tr
                    key={item.providerInquiryId}
                    className="border-t border-white/10 text-slate-200"
                  >
                    <td className="p-4">
                      {item.user.firstName} {item.user.lastName}
                    </td>
                    <td className="p-4">{item.provider}</td>
                    <td className="p-4 font-mono text-xs">{item.providerInquiryId}</td>
                    <td className="p-4">{item.providerStatus}</td>
                    <td className="p-4">{item.adminStatus}</td>
                    <td className="p-4">
                      {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "—"}
                    </td>
                    <td className="p-4">
                      {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : "—"}
                    </td>
                    <td className="p-4">
                      <Button
                        size="sm"
                        onClick={() => void decidePersona(item, "APPROVED")}
                        className="mr-2 bg-emerald-500 hover:bg-emerald-400"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void decidePersona(item, "REJECTED")}
                        className="border-rose-400/30 text-rose-200"
                      >
                        Reject
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {items.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-white/15 p-12 text-center">
          <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-400" />
          <p className="mt-4 font-semibold text-white">No verification requests waiting</p>
          <p className="mt-1 text-sm text-slate-400">
            New professional submissions will appear here.
          </p>
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#11182b] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-400">
                  Professional verification
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold text-white">
                  {selected.user.firstName} {selected.user.lastName}
                </h2>
                <p className="mt-1 text-sm text-slate-400">{selected.user.email}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {docs(selected).map((item) => (
                <article
                  key={item.label}
                  className="rounded-xl border border-white/10 bg-[#0b1020] p-4"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-400" />
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                  </div>
                  {item.value ? (
                    <div className="mt-3">
                      <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                        <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                        Submitted
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDocument({
                            label: item.label,
                            value: item.value!,
                            owner: `${selected.user.firstName} ${selected.user.lastName}`,
                          })
                        }
                        className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
                      >
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        View document
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          setConfirmDoc({ key: item.key, label: item.label, status: "APPROVED" })
                        }
                        className={
                          selected.reviews.find((review) => review.documentKey === item.key)
                            ?.status === "APPROVED"
                            ? "ml-2 bg-emerald-500/30 text-emerald-100"
                            : "ml-2 bg-emerald-500 hover:bg-emerald-400"
                        }
                      >
                        {selected.reviews.find((review) => review.documentKey === item.key)
                          ?.status === "APPROVED"
                          ? "Approved"
                          : "Approve document"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setConfirmDoc({ key: item.key, label: item.label, status: "REJECTED" })
                        }
                        className={
                          selected.reviews.find((review) => review.documentKey === item.key)
                            ?.status === "REJECTED"
                            ? "ml-2 border-rose-400/30 bg-rose-500/20 text-rose-100"
                            : "ml-2 border-rose-400/30 bg-transparent text-rose-200 hover:bg-rose-500/10 hover:text-rose-100"
                        }
                      >
                        {selected.reviews.find((review) => review.documentKey === item.key)
                          ?.status === "REJECTED"
                          ? "Rejected"
                          : "Reject document"}
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">Not submitted</p>
                  )}
                </article>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmOverall("REJECTED")}
                className="border-rose-400/30 bg-transparent text-rose-200 hover:bg-rose-500/10 hover:text-rose-100"
              >
                Reject
              </Button>
              <Button
                onClick={() => setConfirmOverall("APPROVED")}
                className="bg-emerald-500 hover:bg-emerald-400"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Approve verification
              </Button>
            </div>
          </div>
        </div>
      )}
      {confirmDoc && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/65 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#11182b] p-6">
            <h2 className="font-display text-lg font-bold text-white">
              {confirmDoc.status === "APPROVED" ? "Approve document?" : "Reject document?"}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {confirmDoc.status === "APPROVED"
                ? `Mark "${confirmDoc.label}" as approved for ${selected?.user.firstName} ${selected?.user.lastName}.`
                : `Mark "${confirmDoc.label}" as rejected for ${selected?.user.firstName} ${selected?.user.lastName}.`}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                className="border-white/10 bg-transparent text-slate-300 hover:bg-white/10 hover:text-white"
                onClick={() => setConfirmDoc(null)}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                className={
                  confirmDoc.status === "APPROVED"
                    ? "border-emerald-400/30 bg-transparent text-emerald-200 hover:bg-emerald-500/10 hover:text-emerald-100"
                    : "border-rose-400/30 bg-transparent text-rose-200 hover:bg-rose-500/10 hover:text-rose-100"
                }
                onClick={() => {
                  const { key, status } = confirmDoc;
                  setConfirmDoc(null);
                  void decideDocument(key, status);
                }}
              >
                {confirmDoc.status === "APPROVED" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {confirmOverall && selected && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/65 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#11182b] p-6">
            <h2 className="font-display text-lg font-bold text-white">
              {confirmOverall === "APPROVED" ? "Approve verification?" : "Reject verification?"}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {confirmOverall === "APPROVED"
                ? `${selected.user.firstName} ${selected.user.lastName} will be marked as a verified professional.`
                : `${selected.user.firstName} ${selected.user.lastName}'s verification request will be rejected.`}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                className="border-white/10 bg-transparent text-slate-300 hover:bg-white/10 hover:text-white"
                onClick={() => setConfirmOverall(null)}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                className={
                  confirmOverall === "APPROVED"
                    ? "border-emerald-400/30 bg-transparent text-emerald-200 hover:bg-emerald-500/10 hover:text-emerald-100"
                    : "border-rose-400/30 bg-transparent text-rose-200 hover:bg-rose-500/10 hover:text-rose-100"
                }
                onClick={() => {
                  const status = confirmOverall;
                  setConfirmOverall(null);
                  void decide(status);
                }}
              >
                {confirmOverall === "APPROVED" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {document && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl border border-white/10 bg-[#11182b] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-400">
                  Document review
                </p>
                <h2 className="mt-2 font-display text-xl font-bold text-white">{document.label}</h2>
                <p className="mt-1 text-sm text-slate-400">Submitted by {document.owner}</p>
              </div>
              <button
                onClick={() => setDocument(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {document.value.startsWith("/") ? (
              document.value.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={document.value}
                  className="mt-6 h-[65vh] w-full rounded-2xl bg-white"
                  title={document.label}
                />
              ) : (
                <img
                  src={document.value}
                  alt={document.label}
                  className="mt-6 max-h-[65vh] w-full rounded-2xl object-contain bg-black"
                />
              )
            ) : (
              <div className="mt-6 rounded-2xl border border-white/10 bg-[#0b1020] p-5">
                <FileText className="h-8 w-8 text-indigo-400" />
                <p className="mt-4 break-all text-sm text-white">{document.value}</p>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  This older request only stored the file name, so the original image is not
                  available. Please upload the document again from the Professional Verification
                  page.
                </p>
              </div>
            )}
            <Button className="mt-6 w-full" variant="outline" onClick={() => setDocument(null)}>
              Close document
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
