"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPendingVerifications,
  setVerificationStatus,
} from "@/services/admin.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/spinner";
import {
  CheckCircle,
  XCircle,
  User,
  Eye,
  Clock,
  MapPin,
  Briefcase,
  FileText,
  X,
  ShieldCheck,
} from "lucide-react";
import type { PendingExpert } from "@/types";
import { fmtDate } from "@/lib/utils";

function DocSlot({
  label,
  url,
  onOpen,
}: {
  label: string;
  url: string | null;
  onOpen: (u: string) => void;
}) {
  if (!url) {
    return (
      <div className="aspect-[4/3] rounded-lg border border-dashed border-[var(--border)] bg-[#111827] flex flex-col items-center justify-center gap-1 p-2">
        <FileText size={20} className="text-[var(--border)]" />
        <span className="text-xs text-[var(--text-muted)] text-center">
          {label}
        </span>
        <span className="text-[10px] text-[var(--border)]">Not uploaded</span>
      </div>
    );
  }
  return (
    <button
      onClick={() => onOpen(url)}
      className="relative group aspect-[4/3] w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[#111827] cursor-pointer"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Eye size={22} className="text-white" />
        <span className="text-xs text-white font-medium">View full size</span>
      </div>
      <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 text-center">
        {label}
      </span>
    </button>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <div className="text-xs text-[var(--text-muted)] mb-0.5">{label}</div>
      <div className="text-sm text-[var(--text)]">
        {value ?? (
          <span className="text-[var(--border)] italic">Not provided</span>
        )}
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold text-[var(--primary)] uppercase tracking-widest mb-3">
      {children}
    </h3>
  );
}

export default function VerificationPage() {
  const qc = useQueryClient();
  const [reviewing, setReviewing] = useState<PendingExpert | null>(null);
  const [action, setAction] = useState<"VERIFIED" | "REJECTED" | null>(null);
  const [note, setNote] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["verification-pending"],
    queryFn: getPendingVerifications,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      setVerificationStatus(
        reviewing!.userId,
        action!,
        action === "REJECTED" ? note : null,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["verification-pending"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setReviewing(null);
      setAction(null);
      setNote("");
    },
  });

  const closeReview = () => {
    setReviewing(null);
    setAction(null);
    setNote("");
  };

  if (isLoading) return <PageSpinner />;

  const docCount = (e: PendingExpert) =>
    [
      e.selfieUrl,
      e.tazkiraFrontUrl,
      e.tazkiraBackUrl,
      e.shopImageUrl,
      e.workLicenseUrl,
    ].filter(Boolean).length;

  return (
    <div>
      <PageHeader
        title="Expert Verification"
        subtitle={`${data?.length ?? 0} pending`}
      />

      {data?.length === 0 && (
        <Card className="text-center py-12">
          <CheckCircle className="mx-auto text-green-400 mb-3" size={36} />
          <p className="text-[var(--text-muted)]">
            No pending verifications — all clear.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {data?.map((expert) => (
          <Card key={expert.id} className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#374151] flex items-center justify-center flex-shrink-0 overflow-hidden">
                {expert.selfieUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={expert.selfieUrl}
                    alt={expert.user.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <User size={20} className="text-[var(--text-muted)]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[var(--text)]">
                  {expert.user.name}
                </div>
                <div className="text-sm text-[var(--text-muted)]">
                  {expert.user.phone}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <Clock size={11} />
                    Submitted {fmtDate(expert.createdAt)}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    <span
                      className={
                        docCount(expert) === 5
                          ? "text-green-400 font-medium"
                          : "text-yellow-400 font-medium"
                      }
                    >
                      {docCount(expert)}/5
                    </span>{" "}
                    docs
                  </span>
                </div>
                {expert.serviceZones.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {expert.serviceZones.map((sz) => (
                      <span
                        key={sz.zone.id}
                        className="text-xs bg-[#374151] text-[var(--text)] rounded px-2 py-0.5"
                      >
                        {sz.zone.nameEn}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-shrink-0">
                <Button size="sm" onClick={() => setReviewing(expert)}>
                  <Eye size={14} /> Review
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Review panel ─────────────────────────────────────────────────────── */}
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeReview} />
          <div className="relative bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
            {/* Sticky header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} className="text-[var(--primary)]" />
                <span className="font-semibold text-[var(--text)]">
                  Reviewing: {reviewing.user.name}
                </span>
              </div>
              <button
                onClick={closeReview}
                className="text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              {/* Expert summary */}
              <div className="flex items-center gap-4 pb-4 border-b border-[var(--border)]">
                <div className="w-16 h-16 rounded-full bg-[#374151] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {reviewing.selfieUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={reviewing.selfieUrl}
                      alt={reviewing.user.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <User size={26} className="text-[var(--text-muted)]" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-lg font-semibold text-[var(--text)]">
                    {reviewing.user.name}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">
                    {reviewing.user.phone}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    Registered {fmtDate(reviewing.user.createdAt)} · Submitted
                    for review {fmtDate(reviewing.createdAt)}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-lg font-bold ${docCount(reviewing) === 5 ? "text-green-400" : "text-yellow-400"}`}
                  >
                    {docCount(reviewing)}/5
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    documents
                  </div>
                </div>
              </div>

              {/* Identity documents */}
              <div>
                <SectionHeading>Identity Documents</SectionHeading>
                <div className="grid grid-cols-3 gap-3">
                  <DocSlot
                    label="Selfie"
                    url={reviewing.selfieUrl}
                    onOpen={setLightboxUrl}
                  />
                  <DocSlot
                    label="Tazkira — Front"
                    url={reviewing.tazkiraFrontUrl}
                    onOpen={setLightboxUrl}
                  />
                  <DocSlot
                    label="Tazkira — Back"
                    url={reviewing.tazkiraBackUrl}
                    onOpen={setLightboxUrl}
                  />
                </div>
              </div>

              {/* Business information */}
              <div>
                <SectionHeading>Business Information</SectionHeading>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-4">
                  <InfoField label="Shop Name" value={reviewing.shopName} />
                  <InfoField
                    label="Shop Zone"
                    value={
                      reviewing.shopZone?.nameEn ??
                      (reviewing.shopZoneId
                        ? `Zone ID: ${reviewing.shopZoneId}`
                        : null)
                    }
                  />

                  <InfoField
                    label="Shop Address"
                    value={reviewing.shopAddress}
                  />

                  {reviewing.description && (
                    <InfoField
                      label="Experience / Description"
                      value={reviewing.description}
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <DocSlot
                    label="Shop Photo"
                    url={reviewing.shopImageUrl}
                    onOpen={setLightboxUrl}
                  />
                  <DocSlot
                    label="Work License"
                    url={reviewing.workLicenseUrl}
                    onOpen={setLightboxUrl}
                  />
                </div>
              </div>

              {/* Service zones */}
              <div>
                <SectionHeading>Service Zones</SectionHeading>
                {reviewing.serviceZones.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {reviewing.serviceZones.map((sz) => (
                      <span
                        key={sz.zone.id}
                        className="flex items-center gap-1.5 text-sm bg-[#374151] text-[var(--text)] rounded-full px-3 py-1"
                      >
                        <MapPin size={12} className="text-[var(--primary)]" />
                        {sz.zone.nameEn}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)] italic">
                    No service zones assigned.
                  </p>
                )}
              </div>

              {/* Decision */}
              <div className="pt-4 border-t border-[var(--border)]">
                <SectionHeading>Decision</SectionHeading>

                {!action && (
                  <div className="flex gap-3">
                    <Button onClick={() => setAction("VERIFIED")}>
                      <CheckCircle size={15} /> Approve Expert
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => setAction("REJECTED")}
                    >
                      <XCircle size={15} /> Reject Application
                    </Button>
                  </div>
                )}

                {action === "VERIFIED" && (
                  <div>
                    <div className="flex items-start gap-3 bg-green-900/20 border border-green-700/30 rounded-lg p-4 mb-4">
                      <CheckCircle
                        size={18}
                        className="text-green-400 flex-shrink-0 mt-0.5"
                      />
                      <p className="text-sm text-[var(--text)]">
                        Approving will grant welcome credits and send a
                        notification to{" "}
                        <span className="font-medium">
                          {reviewing.user.name}
                        </span>
                        . This cannot be undone without manual intervention.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={() => mutate()} disabled={isPending}>
                        {isPending ? "Saving…" : "Confirm Approval"}
                      </Button>
                      <Button variant="ghost" onClick={() => setAction(null)}>
                        Go back
                      </Button>
                    </div>
                  </div>
                )}

                {action === "REJECTED" && (
                  <div>
                    <label className="block text-sm text-[var(--text-muted)] mb-1.5">
                      Rejection reason <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      className="w-full bg-[#111827] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] resize-none h-24 mb-4"
                      placeholder="e.g. Tazkira image is unclear. Please resubmit with a clearer photo."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <div className="flex gap-3">
                      <Button
                        variant="danger"
                        onClick={() => mutate()}
                        disabled={isPending || !note.trim()}
                      >
                        {isPending ? "Saving…" : "Confirm Rejection"}
                      </Button>
                      <Button variant="ghost" onClick={() => setAction(null)}>
                        Go back
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Image lightbox ────────────────────────────────────────────────────── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Document"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors cursor-pointer"
            onClick={() => setLightboxUrl(null)}
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
