"use client";
import type { ReactNode } from "react";

const ARCHIVO = "Archivo, sans-serif";

/** Shared loading / error / empty states so every screen fails and waits the
 *  same way. Uses the Lineage design tokens (navy, champagne, terracotta). */

export function LoadingState({ label = "Loading", minHeight = 280 }: { label?: string; minHeight?: number }) {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight, gap: 14, fontFamily: ARCHIVO }}>
      <svg className="animate-spin" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C9A86A" strokeWidth="2" strokeLinecap="round">
        <path d="M21 12a9 9 0 1 1-6.2-8.6" />
      </svg>
      <span style={{ fontSize: 13.5, color: "#707A8A", letterSpacing: "0.02em" }}>{label}</span>
    </div>
  );
}

export function ErrorState({
  message = "We could not reach the service. Check that the backend is running, then try again.",
  onRetry,
  minHeight = 280,
}: {
  message?: string;
  onRetry?: () => void;
  minHeight?: number;
}) {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight, padding: 24, fontFamily: ARCHIVO }}>
      <div style={{ maxWidth: 420, textAlign: "center", background: "#fff", border: "1px solid #EBD2BE", borderRadius: 14, padding: "26px 28px" }}>
        <div style={{ width: 40, height: 40, margin: "0 auto 14px", borderRadius: "50%", background: "#FBF1EA", display: "grid", placeItems: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8895E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
        </div>
        <div style={{ fontFamily: "Spectral, serif", fontSize: 18, color: "#141E3C", marginBottom: 6 }}>We could not load this</div>
        <div style={{ fontSize: 13.5, color: "#707A8A", lineHeight: 1.55, marginBottom: onRetry ? 18 : 0 }}>{message}</div>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "#141E3C", color: "#F7F5F0", fontSize: 13, fontWeight: 600, fontFamily: ARCHIVO, cursor: "pointer", boxShadow: "inset 0 0 0 1px #C9A86A" }}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ title, hint, icon, minHeight = 180 }: { title: string; hint?: string; icon?: ReactNode; minHeight?: number }) {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight, padding: 24, textAlign: "center", fontFamily: ARCHIVO }}>
      <div style={{ maxWidth: 380 }}>
        {icon ? <div style={{ marginBottom: 10 }}>{icon}</div> : null}
        <div style={{ fontFamily: "Spectral, serif", fontSize: 16, color: "#141E3C", marginBottom: 4 }}>{title}</div>
        {hint ? <div style={{ fontSize: 13, color: "#707A8A", lineHeight: 1.5 }}>{hint}</div> : null}
      </div>
    </div>
  );
}
