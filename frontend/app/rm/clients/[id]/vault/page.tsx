"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { ClientState, DocumentRec } from "@/lib/types";
import { docLabel } from "@/lib/format";
import { LoadingState, ErrorState, EmptyState } from "@/components/states";
import { ClientSwitcher } from "@/components/client-switcher";

const FileIconNavy = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1B2A4A" strokeWidth="1.5">
    <path d="M4 4h11l5 5v11H4z" />
    <path d="M15 4v5h5" />
  </svg>
);

const FileIconFlag = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9F5E3A" strokeWidth="1.5">
    <path d="M4 4h11l5 5v11H4z" />
    <path d="M15 4v5h5" />
  </svg>
);

function agentFor(doc: DocumentRec): string {
  const t = (doc.doc_type || "").toLowerCase();
  if (doc.flagged) return "Compliance Agent";
  if (t.includes("identity") || t.includes("passport") || t.includes("address")) return "KYC Agent";
  if (t.includes("wealth") || t.includes("financial")) return "Wealth Planner";
  if (t.includes("background") || t.includes("compliance")) return "Compliance Agent";
  return "KYC Agent";
}

function categoryFor(doc: DocumentRec): string {
  const t = (doc.doc_type || "").toLowerCase();
  if (doc.flagged || t.includes("compliance")) return "Compliance";
  if (t.includes("wealth") || t.includes("financial")) return "Wealth";
  if (t.includes("background")) return "Background";
  return "Identity";
}

export default function DocumentVaultPage() {
  const { id } = useParams<{ id: string }>();
  const clientId = id || "sarah_keller";
  const [state, setState] = useState<ClientState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(() => {
    let alive = true;
    setLoading(true);
    setLoadErr(false);
    api
      .getClient(clientId)
      .then((s) => {
        if (alive) setState(s);
      })
      .catch(() => {
        if (alive) setLoadErr(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [clientId]);

  useEffect(() => reload(), [reload]);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      await api.uploadDocuments(clientId, Array.from(fileList));
      const fresh = await api.getClient(clientId);
      setState(fresh);
    } catch {
      setUploadError("Upload failed. Check the backend and try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (loading) {
    return <LoadingState label="Loading vault" minHeight={420} />;
  }

  if (loadErr) {
    return <ErrorState onRetry={reload} minHeight={420} />;
  }

  const docs = state?.documents ?? [];
  const clientName = state?.client?.name ?? "Sarah Keller";
  const firstName = clientName.split(" ")[0];
  const trust = state?.trust?.score ?? 82;
  const verifiedCount = docs.filter((d) => !d.flagged).length;
  const flaggedCount = docs.filter((d) => d.flagged).length;

  return (
    <div style={{ fontFamily: "Archivo, sans-serif", color: "#3C4456" }}>
      {/* client header bar */}
      <div
        style={{
          height: 68,
          borderBottom: "1px solid #E4DFD3",
          background: "#FBFAF6",
          display: "flex",
          alignItems: "center",
          padding: "0 32px",
          gap: 18,
        }}
      >
        <ClientSwitcher
          currentId={clientId}
          hrefFor={(id) => `/rm/clients/${id}/vault`}
          subtitle={`Document Vault · ${docs.length} items`}
        />
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "7px 14px",
            border: "1px solid #E4DFD3",
            borderRadius: 999,
            background: "#fff",
          }}
        >
          <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#707A8A", fontWeight: 600 }}>
            Trust
          </span>
          <span style={{ fontFamily: "Spectral, serif", fontSize: 18, color: "#A8854A" }}>{trust}</span>
        </div>
      </div>

      <div style={{ padding: "28px 32px 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#A8854A", fontWeight: 700 }}>
              Records
            </div>
            <div style={{ fontFamily: "Spectral, serif", fontWeight: 400, fontSize: 29, color: "#141E3C", marginTop: 6 }}>
              Document Vault
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                background: "#fff",
                border: "1px solid #E4DFD3",
                borderRadius: 999,
                fontSize: 12.5,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5E806B" }} />
              {verifiedCount} verified
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                background: "#fff",
                border: "1px solid #E4DFD3",
                borderRadius: 999,
                fontSize: 12.5,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8895E" }} />
              {flaggedCount} flagged
            </div>
          </div>
        </div>

        {/* dropzone strip */}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: "none" }}
        />
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!uploading) handleFiles(e.dataTransfer.files);
          }}
          style={{
            border: "1.5px dashed #C9A86A",
            borderRadius: 11,
            padding: "18px 24px",
            background: "#FBF7EE",
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 22,
            cursor: uploading ? "default" : "pointer",
            opacity: uploading ? 0.7 : 1,
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#A8854A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V5" />
            <path d="M8 9l4-4 4 4" />
            <path d="M5 19h14" />
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: "#141E3C", fontWeight: 600 }}>
              Add documents to {firstName}'s vault
            </div>
            <div style={{ fontSize: 12.5, color: "#707A8A" }}>
              Each upload is auto-routed to the right verification agent. Drop PDFs or click to pick.
            </div>
          </div>
          <span
            style={{
              padding: "9px 18px",
              background: "#141E3C",
              color: "#F7F5F0",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {uploading ? "Uploading..." : "Upload"}
          </span>
        </div>

        {uploadError && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 16px",
              marginBottom: 22,
              marginTop: -6,
              background: "#FBF1EA",
              border: "1px solid #EBD2BE",
              borderRadius: 9,
              fontSize: 12.5,
              color: "#9F5E3A",
            }}
          >
            <span style={{ flex: 1 }}>{uploadError}</span>
            <button
              onClick={() => setUploadError(null)}
              style={{
                border: "none",
                background: "transparent",
                color: "#9F5E3A",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Archivo, sans-serif",
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* table */}
        <div style={{ background: "#fff", border: "1px solid #E4DFD3", borderRadius: 12, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2.2fr 1.3fr 1.4fr 1fr",
              gap: 14,
              padding: "13px 24px",
              fontSize: 10.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#A6ADBB",
              fontWeight: 600,
              borderBottom: "1px solid #F1ECE1",
            }}
          >
            <span>Document</span>
            <span>Handled by</span>
            <span>Status</span>
            <span style={{ textAlign: "right" }}>Added</span>
          </div>

          {docs.length === 0 && (
            <EmptyState
              title="No documents yet"
              hint="Drop this client's onboarding PDFs above to start verification."
              minHeight={160}
            />
          )}

          {docs.map((doc, i) => {
            const flagged = doc.flagged;
            const last = i === docs.length - 1;
            const sizeMb = (((doc.extracted_text?.length || 0) / 1024) || 0.8).toFixed(1);
            return (
              <div
                key={doc.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2.2fr 1.3fr 1.4fr 1fr",
                  gap: 14,
                  padding: "16px 24px",
                  alignItems: "center",
                  borderBottom: last ? "none" : "1px solid #F4EFE6",
                  background: flagged ? "#FDF8F2" : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <span
                    style={{
                      width: 38,
                      height: 46,
                      borderRadius: 5,
                      background: flagged ? "#F7EAE1" : "#EEF1F6",
                      border: flagged ? "1px solid #EBD2BE" : "1px solid #E0E4EC",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {flagged ? FileIconFlag : FileIconNavy}
                  </span>
                  <div>
                    <div style={{ fontSize: 14, color: "#141E3C", fontWeight: 600 }}>{docLabel(doc.filename, doc.doc_type)}</div>
                    <div style={{ fontSize: 11.5, color: "#707A8A" }}>
                      {categoryFor(doc)} · {sizeMb} MB
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: "#3C4456" }}>{agentFor(doc)}</div>
                <div>
                  {flagged ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "#9F5E3A", fontWeight: 600 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8895E" }} />
                      Flagged · adverse media
                    </span>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "#436B52", fontWeight: 600 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5E806B" }} />
                      Verified
                    </span>
                  )}
                </div>
                <div style={{ textAlign: "right", fontSize: 12, color: "#A6ADBB" }}>
                  {flagged ? "1 day ago" : "2 days ago"}
                </div>
              </div>
            );
          })}
        </div>

        {/* extracted-text previews */}
        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
          {docs.map((doc) => (
            <div
              key={doc.id}
              style={{
                background: "#fff",
                border: doc.flagged ? "1px solid #EBD2BE" : "1px solid #E4DFD3",
                borderRadius: 12,
                padding: "16px 20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                <span style={{ fontSize: 13.5, color: "#141E3C", fontWeight: 600 }}>{docLabel(doc.filename, doc.doc_type)}</span>
                <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8854A", fontWeight: 600 }}>
                  Extracted text
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "#707A8A", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                {(doc.extracted_text || "No text extracted.").slice(0, 320)}
                {(doc.extracted_text?.length || 0) > 320 ? "…" : ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
