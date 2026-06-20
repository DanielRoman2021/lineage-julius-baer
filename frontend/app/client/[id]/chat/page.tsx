"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { MobileFrame } from "@/components/mobile-frame";

type Msg = { them?: boolean; mine?: boolean; text: string; time: string };

const INITIAL: Msg[] = [
  { them: true, text: "Hi Sarah. Two small things left and your onboarding is finished.", time: "14:02" },
  { them: true, text: "I have set aside time on Thursday to walk through the trust draft.", time: "14:02" },
  { mine: true, text: "Thank you Markus. Thursday works. Should I bring anything?", time: "14:18" },
  { them: true, text: "Just yourself. I will have the draft and your plan ready on screen.", time: "14:25" },
];

export default function ClientChatPage() {
  useParams<{ id: string }>();
  const [draft, setDraft] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>(INITIAL);

  function add() {
    const t = draft.trim();
    if (!t) return;
    setMsgs((s) => [...s, { mine: true, text: t, time: "now" }]);
    setDraft("");
  }

  return (
    <MobileFrame title="Secure chat">
      <div style={{ height: 760, display: "flex", flexDirection: "column", background: "#F7F5F0", fontFamily: "Archivo, sans-serif" }}>
        {/* status bar */}
        <div style={{ height: 46, flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 26px", fontSize: 13, fontWeight: 600, color: "#141E3C" }}>
          <span>9:41</span>
          <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <svg width="17" height="11" viewBox="0 0 17 11" fill="#141E3C"><rect x="0" y="6" width="3" height="5" rx="1" /><rect x="4.5" y="4" width="3" height="7" rx="1" /><rect x="9" y="2" width="3" height="9" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" /></svg>
            <svg width="22" height="11" viewBox="0 0 24 12" fill="none"><rect x="1" y="1" width="19" height="10" rx="2.5" stroke="#141E3C" /><rect x="2.5" y="2.5" width="14" height="7" rx="1.2" fill="#141E3C" /><rect x="21" y="4" width="2" height="4" rx="1" fill="#141E3C" /></svg>
          </span>
        </div>

        {/* header */}
        <div style={{ flex: "none", padding: "6px 18px 14px", borderBottom: "1px solid #EDE7DA", display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/client" style={{ textDecoration: "none" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3C4456" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </a>
          <span style={{ width: 40, height: 40, borderRadius: "50%", background: "#1B2A4A", color: "#F7F5F0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>MB</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, color: "#141E3C", fontWeight: 600 }}>Markus Brunner</div>
            <div style={{ fontSize: 11.5, color: "#5E806B", display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#5E806B" strokeWidth="2"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              Encrypted and logged
            </div>
          </div>
        </div>

        {/* thread */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
          {/* pinned */}
          <div style={{ background: "#FBF3E2", border: "1px solid #E7D4AE", borderRadius: 14, padding: "14px 16px", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A8854A", fontWeight: 700, marginBottom: 7 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A8854A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5" /><path d="M9 10.76V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5.76l1.5 3.24H7.5z" /></svg>
              Pinned note
            </div>
            <div style={{ fontSize: 13.5, color: "#3C4456", lineHeight: 1.6 }}>Thursday at 3pm to walk through the trust draft. I will share the document here first.</div>
          </div>

          <div style={{ textAlign: "center", fontSize: 11, color: "#A6ADBB", marginBottom: 16 }}>Today</div>

          {msgs.map((m, i) =>
            m.them ? (
              <div key={i} style={{ display: "flex", marginBottom: 12 }}>
                <div style={{ maxWidth: "78%", background: "#fff", border: "1px solid #EAE4D7", borderRadius: "4px 16px 16px 16px", padding: "11px 14px" }}>
                  <div style={{ fontSize: 14, color: "#2C3344", lineHeight: 1.5 }}>{m.text}</div>
                  <div style={{ fontSize: 10, color: "#B4BAC6", marginTop: 4 }}>{m.time}</div>
                </div>
              </div>
            ) : (
              <div key={i} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <div style={{ maxWidth: "78%", background: "#1B2A4A", borderRadius: "16px 4px 16px 16px", padding: "11px 14px" }}>
                  <div style={{ fontSize: 14, color: "#F4F1EA", lineHeight: 1.5 }}>{m.text}</div>
                  <div style={{ fontSize: 10, color: "#8A93A8", marginTop: 4, textAlign: "right" }}>{m.time}</div>
                </div>
              </div>
            )
          )}
        </div>

        {/* input */}
        <div style={{ flex: "none", padding: "12px 16px 16px", borderTop: "1px solid #EDE7DA", background: "#FBFAF6" }}>
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") add(); }}
              placeholder="Write a reply"
              style={{ flex: 1, minWidth: 0, padding: "13px 16px", border: "1px solid #E4DFD3", borderRadius: 999, fontFamily: "Archivo, sans-serif", fontSize: 14, color: "#141E3C", outline: "none", background: "#fff" }}
            />
            <button
              onClick={add}
              style={{ width: 46, height: 46, flex: "none", border: "none", borderRadius: "50%", background: "#C9A86A", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#141E3C" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg>
            </button>
          </div>
        </div>
      </div>
    </MobileFrame>
  );
}
